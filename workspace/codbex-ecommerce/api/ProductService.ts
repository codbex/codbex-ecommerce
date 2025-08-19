import { Controller, Get, response } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './utils/UtilsService';
import * as productUtils from './utils/ProductUtilsService';
import { Money, ErrorResponse, ProductResponse } from './types/Types';

@Controller
class ProductService {

    @Get("/products")
    public productsData(): ProductResponse[] | ErrorResponse {
        try {
            const productQuery = sql.getDialect()
                .select()
                .column('PRODUCT_ID')
                .column('PRODUCT_TITLE')
                .column('PRODUCT_CATEGORY')
                .column('PRODUCT_MANUFACTURER')
                .column('PRODUCT_SHORTDESCRIPTION')
                .column('PRODUCT_PRICE')
                .column('PRODUCT_CURRENCY')
                .from('CODBEX_PRODUCT')
                .limit(30)
                .build();

            const products = query.execute(productQuery) || [];

            if (products.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'No products found'
                );
            }

            const productIds = products.map(p => p.PRODUCT_ID);
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
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Invalid request',
                    'Product ID is required'
                );
            }

            const productQuery = sql.getDialect()
                .select()
                .column('PRODUCT_ID')
                .column('PRODUCT_TITLE')
                .column('PRODUCT_CATEGORY')
                .column('PRODUCT_MANUFACTURER')
                .column('PRODUCT_SHORTDESCRIPTION')
                .column('PRODUCT_DESCRIPTION')
                .column('PRODUCT_PRICE')
                .column('PRODUCT_CURRENCY')
                .from('CODBEX_PRODUCT')
                .where('PRODUCT_ID = ?')
                .build();

            const attributeQuery = sql.getDialect()
                .select()
                .column('PRODUCTATTRIBUTE_NAME')
                .column('PRODUCTATTRIBUTE_VALUE')
                .column('PRODUCTATTRIBUTEGROUP_NAME')
                .from('CODBEX_PRODUCTATTRIBUTE')
                .leftJoin('CODBEX_PRODUCTATTRIBUTEGROUP', 'PRODUCTATTRIBUTE_GROUP = PRODUCTATTRIBUTEGROUP_ID')
                .where('PRODUCTATTRIBUTE_PRODUCT = ?')
                .build();

            const imagesQuery = sql.getDialect()
                .select()
                .column('PRODUCTIMAGE_IMAGELINK')
                .column('PRODUCTIMAGE_ISFEATURE')
                .from('CODBEX_PRODUCTIMAGE')
                .where('PRODUCTIMAGE_PRODUCT = ?')
                .build();

            const availabilityQuery = sql.getDialect()
                .select()
                .column('PRODUCTAVAILABILITY_QUANTITY')
                .from('CODBEX_PRODUCTAVAILABILITY')
                .where(`PRODUCTAVAILABILITY_PRODUCT = ?`)
                .build();

            const productsResult = query.execute(productQuery, [productId]).at(0);

            if (!productsResult) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No product found with ID ${productId}`
                );
            }

            const imagesResult = query.execute(imagesQuery, [productId]);
            const availabilityResult = query.execute(availabilityQuery, [productId]).at(0);
            const attributeResult = query.execute(attributeQuery, [productId]);
            const productCampaign = productUtils.getCampaign(productId);

            const featuredImage = imagesResult.find(img => img.PRODUCTIMAGE_ISFEATURE === true);

            const currencyCode = productUtils.getCurrencyCode(productsResult.PRODUCT_CURRENCY);

            const productAttributes: Record<string, { name: string; value: string }[]> = {};
            for (const attr of attributeResult) {
                const groupName = attr.PRODUCTATTRIBUTEGROUP_NAME || "Ungrouped";

                if (!productAttributes[groupName]) {
                    productAttributes[groupName] = [];
                }

                productAttributes[groupName].push({
                    name: attr.PRODUCTATTRIBUTE_NAME,
                    value: attr.PRODUCTATTRIBUTE_VALUE
                });
            }

            return {
                id: String(productsResult.PRODUCT_ID),
                title: productsResult.PRODUCT_TITLE,
                category: String(productsResult.PRODUCT_CATEGORY),
                brand: String(productsResult.PRODUCT_MANUFACTURER),
                description: productsResult.PRODUCT_DESCRIPTION,
                shortDescription: productsResult.PRODUCT_SHORTDESCRIPTION,
                price: {
                    amount: productCampaign ? productCampaign.newPrice : productsResult.PRODUCT_PRICE,
                    currency: currencyCode,
                } as Money,
                discountPrice: productCampaign
                    ? { amount: productCampaign.newPrice, currency: currencyCode } as Money
                    : null,
                oldPrice: productCampaign
                    ? { amount: productCampaign.oldPrice, currency: currencyCode } as Money
                    : null,
                discountPercentage: productCampaign?.discountPercentage ?? null,
                availableForSale: availabilityResult.PRODUCTAVAILABILITY_QUANTITY > 0,
                featuredImage: featuredImage ? featuredImage.PRODUCTIMAGE_IMAGELINK : null,
                images: imagesResult.map(img => img.PRODUCTIMAGE_IMAGELINK),
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
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Invalid request',
                    'Category ID is required'
                );
            }

            const productQuery = sql.getDialect()
                .select()
                .column('PRODUCT_ID')
                .column('PRODUCT_TITLE')
                .column('PRODUCT_PRICE')
                .column('PRODUCT_SHORTDESCRIPTION')
                .column('PRODUCT_CURRENCY')
                .column('PRODUCT_MANUFACTURER')
                .column('PRODUCT_CATEGORY')
                .from('CODBEX_PRODUCT')
                .where('PRODUCT_CATEGORY = ?')
                .build();

            const products = query.execute(productQuery, [categoryId]);

            if (products.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No products found in category ${categoryId}`
                );
            }

            const productIds = products.map(p => p.PRODUCT_ID);

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