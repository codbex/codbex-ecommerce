import { Controller, Get, response, request } from "sdk/http";
import * as utils from './utils/UtilsService';
import * as productUtils from './utils/ProductUtilsService';
import { Money, ErrorResponse, ProductResponse } from './types/Types';

import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { ProductDocumentRepository as ProductDocumentDao } from "codbex-products/gen/codbex-products/dao/Products/ProductDocumentRepository";
import { ProductCategoryRepository as ProductCategoryDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductCategoryRepository";
import { ProductAttributeRepository as ProductAttributeDao } from "codbex-products/gen/codbex-products/dao/Products/ProductAttributeRepository";
import { ProductImageRepository as ProductImageDao } from "codbex-products/gen/codbex-products/dao/Products/ProductImageRepository";
import { ProductAvailabilityRepository as ProductAvailabilityDao } from "codbex-inventory/gen/codbex-inventory/dao/Products/ProductAvailabilityRepository";
import { ProductAttributeGroupRepository as ProductAttributeGroupDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductAttributeGroupRepository";

@Controller
class ProductService {

    private readonly productDao;
    private readonly productDocumentDao;
    private readonly productAttributeDao;
    private readonly productImageDao;
    private readonly productAvailabilityDao;
    private readonly productAttributeGroupDao;
    private readonly productCategoryDao;

    constructor() {
        this.productDao = new ProductDao();
        this.productDocumentDao = new ProductDocumentDao();
        this.productCategoryDao = new ProductCategoryDao();
        this.productAttributeDao = new ProductAttributeDao();
        this.productImageDao = new ProductImageDao();
        this.productAvailabilityDao = new ProductAvailabilityDao();
        this.productAttributeGroupDao = new ProductAttributeGroupDao();
    }

    @Get("products/search/:text")
    public productsSearch(_: any, ctx: any) {

        const searchText = ctx.pathParameters.text;
        try {
            const allProducts = this.productDao.findAll();

            const products = allProducts
                .filter(product =>
                    product.Title.toLowerCase().includes(searchText.toLowerCase()) ||
                    product.ShortDescription?.toLowerCase().includes(searchText.toLowerCase())
                )
                .slice(0, 19);

            if (!products || products.length === 0) {
                return [];
            }

            const productIds = products.map(p => p.Id);
            const imageMap = productUtils.getProductsImages(productIds);

            const currencyMap = productUtils.mapProductIdToCurrencyCode(products);

            const productsResponse = products.map(p => {
                const imageData = imageMap.get(p.Id) ?? { featuredImage: null, images: [] };
                const currencyCode = currencyMap.get(p.Id) ?? 'UNKNOWN';
                const productCampaign = productUtils.getCampaign(p.Id);

                return {
                    id: String(p.Id),
                    title: p.Title,
                    price: {
                        amount: productCampaign ? productCampaign.newPrice : p.Price,
                        currency: currencyCode,
                    } as Money,
                    oldPrice: productCampaign
                        ? { amount: productCampaign.oldPrice, currency: currencyCode } as Money
                        : null,
                    featuredImage: imageData.featuredImage
                };
            });

            return productsResponse;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error
            );
        }
    }

    @Get("/products/promotions")
    public productPromotionsData(): ProductResponse[] | ErrorResponse {
        const limitStr = request.getParameter("limit");
        const limit = limitStr !== null && !isNaN(parseInt(limitStr)) ? parseInt(limitStr) : undefined;

        try {
            const allProducts = this.productDao.findAll();

            if (allProducts.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'No products found'
                );
            }

            const productIds = allProducts.map(p => p.Id);
            const productsIdsInCampaign = productUtils.productsIdsInCampaign(productIds);

            let limitedProductIds = [];

            if (limit !== undefined && !isNaN(limit)) {
                let count = 0;
                while (count < limit && productsIdsInCampaign[count]) {
                    limitedProductIds.push(productsIdsInCampaign[count]);
                    count++;
                }
            } else {
                limitedProductIds = productsIdsInCampaign;
            }

            const limitedProductEntities = productUtils.getLimitedProductEntities(limitedProductIds);

            const productsResponse = productUtils.getProductsResponse(productsIdsInCampaign, limitedProductEntities);

            return productsResponse;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error
            );
        }
    }

    @Get("/products")
    public productsData(): ProductResponse[] | ErrorResponse {
        try {
            const allProducts = this.productDao.findAll();
            const products = allProducts.slice(0, 30);

            if (products.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'No products found'
                );
            }

            const productIds = products.map(p => p.Id);
            const productsResponse = productUtils.getProductsResponse(productIds, products);

            return productsResponse;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error
            );
        }
    }

    @Get("/product/:productId")
    public productByIdData(_: any, ctx: any) {
        try {
            const productId = ctx.pathParameters.productId;

            if (!productId) {
                response.setStatus(response.UNPROCESSABLE_CONTENT);
                return utils.createErrorResponse(
                    response.UNPROCESSABLE_CONTENT,
                    'Invalid request',
                    'Product ID is required'
                );
            }

            const productsResult = this.productDao.findById(productId);
            const imagesResult = this.productImageDao.findAll({
                $filter: {
                    equals: {
                        Product: productId
                    }
                }
            });
            const availabilityResult = this.productAvailabilityDao.findAll({
                $filter: {
                    equals: {
                        Product: productId
                    }
                }
            })[0];

            const attributes = this.productAttributeDao.findAll({
                $filter: {
                    equals: {
                        Product: productId
                    }
                }
            });

            const documents = this.productDocumentDao.findAll({
                $filter: {
                    equals: {
                        Product: productId
                    }
                }
            });

            console.log(JSON.stringify(documents));

            const groups = this.productAttributeGroupDao.findAll();

            const groupMap = new Map(
                groups.map(g => [g.Id, g.Name])
            );

            const attributeResult = attributes.map(attr => ({
                ...attr,
                GroupName: groupMap.get(attr.Group) ?? null
            }));

            if (!productsResult) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No product found with ID ${productId}`
                );
            }

            const productCampaign = productUtils.getCampaign(productId);

            const featuredImage = imagesResult.find(img => img.IsFeature === true);

            const currencyCode = utils.getCurrencyCode(productsResult.Currency);

            const productAttributes: Record<string, { name: string; value: string }[]> = {};
            for (const attr of attributeResult) {
                const groupName = attr.GroupName || "Ungrouped";

                if (!productAttributes[groupName]) {
                    productAttributes[groupName] = [];
                }

                productAttributes[groupName].push({
                    name: attr.Name,
                    value: attr.Value
                });
            }

            return {
                id: String(productsResult.Id),
                sku: productsResult.SKU,
                title: productsResult.Title,
                category: String(productsResult.Category),
                brand: String(productsResult.Manufacturer),
                description: productsResult.Description,
                shortDescription: productsResult.ShortDescription,
                price: {
                    amount: productCampaign ? productCampaign.newPrice : productsResult.Price,
                    currency: currencyCode,
                } as Money,
                discountPrice: productCampaign
                    ? { amount: productCampaign.newPrice, currency: currencyCode } as Money
                    : null,
                oldPrice: productCampaign
                    ? { amount: productCampaign.oldPrice, currency: currencyCode } as Money
                    : null,
                discountPercentage: productCampaign?.discountPercentage ?? null,
                availableForSale: availabilityResult.Quantity > 0,
                featuredImage: featuredImage ? featuredImage.ImageLink : null,
                images: imagesResult.map(img => img.ImageLink),
                attributes: productAttributes
            };
        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error
            );
        }
    }

    @Get("/productsByCategory/:categoryId")
    public productsByCategoryData(_: any, ctx: any) {
        try {
            const categoryId = ctx.pathParameters.categoryId;

            if (!categoryId) {
                response.setStatus(response.UNPROCESSABLE_CONTENT);
                return utils.createErrorResponse(
                    response.UNPROCESSABLE_CONTENT,
                    'Invalid request',
                    'Category ID is required'
                );
            }

            const category = this.productCategoryDao.findById(categoryId);

            if (!category) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Category with id ${categoryId} was not found`
                );
            }

            const products = this.productDao.findAll({
                $filter: {
                    equals: {
                        Category: categoryId
                    }
                }
            });

            if (products.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No products found in category ${categoryId}`
                );
            }

            const productIds = products.map(p => p.Id);

            const productsResponse = productUtils.getProductsResponse(productIds, products);

            return productsResponse;
        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Failed to fetch products by category',
                error
            );
        }
    }

}
