import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { ProductCategoryRepository as CategoryDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductCategoryRepository";
import { ManufacturerRepository as ManufacturerDao } from "codbex-partners/gen/codbex-partners/dao/Manufacturers/ManufacturerRepository";

import { Controller, Get } from "sdk/http";

@Controller
class ProductService {

    private readonly productDao;
    private readonly productCategoryDao;
    private readonly manufacturerDao;

    constructor() {
        this.productDao = new ProductDao();
        this.productCategoryDao = new CategoryDao();
        this.manufacturerDao = new ManufacturerDao();
    }

    @Get("/categories")
    public categoriesData() {

        const allCategories = this.productCategoryDao.findAll()
            .map(category => ({
                id: category.Id,
                title: category.Name
            }));

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

        const allProducts = ProductDao.findAll()
            .map(product => ({
                id: product.Id,
                title: product.Title,
                category: product.Category,
                price: product.Price,
                availableForSale: product.ForSale,
                featuredImage: product.Image,
            }));

        return allProducts;
    }

    @Get("/products/:id")
    public productData(_: any, ctx: any) {

        const productId = ctx.pathParameters.productId;

        const product = this.productDao.findById(productId);

        return {
            "id": product.Id,
            "title": product.Title,
            "category": product.Category,
            "brand": product.Manufacturer,
            "description": product.Description,
            "price": product.Price,
            "availableForSale": product.ForSale,
            "featuresImage": product.Image
        };
    }

    @Get("/products/:category/:manufacturer")
    public filteredProducts(_: any, ctx: any) {

        const categoryId = ctx.pathParameters.category;
        const manufacturerId = ctx.pathParameters.manufacturerId;

        let filter = {};

        if (categoryId && manufacturerId) {
            filter = {
                Manufacturer: manufacturerId,
                Category: categoryId
            };
        } else if (categoryId) {
            filter = {
                Category: categoryId
            };
        } else if (manufacturerId) {
            filter = {
                Manufacturer: manufacturerId
            };
        }

        const rawProducts = this.productDao.findAll({
            $filter: { equals: filter }
        });

        const products = rawProducts.map(product => ({
            id: product.Id,
            title: product.Title,
            image: product.Image,
            price: product.Price
        }));

        return products;
    }
}
