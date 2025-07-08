import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { ProductCategoryRepository as CategoryDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductCategoryRepository";
import { ProductImageRepository as ImageDao } from "codbex-products/gen/codbex-products/dao/Products/ProductImageRepository";
import { ManufacturerRepository as ManufacturerDao } from "codbex-partners/gen/codbex-partners/dao/Manufacturers/ManufacturerRepository";

import { Controller, Get, response } from "sdk/http";

@Controller
class ProductService {

    private readonly productDao;
    private readonly productCategoryDao;
    private readonly manufacturerDao;
    private readonly productImageDao;

    constructor() {
        this.productDao = new ProductDao();
        this.productCategoryDao = new CategoryDao();
        this.manufacturerDao = new ManufacturerDao();
        this.productImageDao = new ImageDao();
    }

    @Get("/categories")
    public categoriesData() {

        const allCategories = this.productCategoryDao.findAll()
            .map(category => {
                const productsForCategory = this.productDao.findAll({ $filter: { equals: { Category: category.Id } } })

                return {
                    id: category.Id,
                    title: category.Name,
                    productCount: productsForCategory.length
                }
            });

        return allCategories;
    }

    @Get("/brands")
    public brandsData() {

        const allBrands = this.manufacturerDao.findAll()
            .map(brand => ({
                id: brand.Id,
                name: brand.Name
            }));

        return allBrands;
    }

    @Get("/products")
    public allProducts() {

        const allProducts = this.productDao.findAll();

        const productIds = allProducts.map(product => product.Id);

        const featuredImages = this.productImageDao.findAll({
            $filter: {
                equals: { IsFeature: true },
                in: { Product: productIds }
            }
        });

        const featuredImageMap = new Map<string, typeof featuredImages[0]>();

        for (const image of featuredImages) {
            if (!featuredImageMap.has(image.Product)) {
                featuredImageMap.set(image.Product, image);
            }
        }

        const productsResponse = allProducts.map(product => ({
            id: product.Id,
            title: product.Title,
            price: product.Price,
            category: product.Category,
            featuredImage: featuredImageMap.get(product.Id) ?? null
        }));

        return productsResponse;
    }

    @Get("/product/:productId")
    public productData(_: any, ctx: any) {

        const productId = ctx.pathParameters.productId;

        const product = this.productDao.findById(productId);

        if (!product) {
            response.setStatus(response.NOT_FOUND);
            return { message: "Product with that ID doesn't exist!" };
        }

        const images = this.productImageDao.findAll({
            $filter: {
                equals: {
                    Product: productId
                }
            }
        });

        const featuredImage = images.find(image => image.IsFeature === true);

        return {
            "id": product.Id,
            "title": product.Title,
            "category": product.Category,
            "brand": product.Manufacturer,
            "description": product.Description,
            "price": product.Price,
            "featuredImage": featuredImage,
            "images": images
        };
    }

    @Get("/productsByCategory/:categoryId")
    public productByCategory(_: any, ctx: any) {
        const categoryId = ctx.pathParameters.categoryId;

        const category = this.productCategoryDao.findById(categoryId);

        if (!category) {
            response.setStatus(response.NOT_FOUND);
            return { message: "Category with that ID doesn't exist!" };
        }

        const productsByCategory = this.productDao.findAll({ $filter: { equals: { Category: category.Id } } })

        const productIds = productsByCategory.map(product => product.Id);

        const featuredImages = this.productImageDao.findAll({
            $filter: {
                equals: { IsFeature: true },
                in: { Product: productIds }
            }
        });

        const featuredImageMap = new Map<string, typeof featuredImages[0]>();

        for (const image of featuredImages) {
            if (!featuredImageMap.has(image.Product)) {
                featuredImageMap.set(image.Product, image);
            }
        }

        const productsResponse = productsByCategory.map(product => ({
            id: product.Id,
            title: product.Title,
            price: product.Price,
            category: product.Category,
            featuredImage: featuredImageMap.get(product.Id) ?? null
        }));

        return productsResponse;
    }
}
