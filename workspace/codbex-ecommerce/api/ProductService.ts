import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { Controller, Get } from "sdk/http";

@Controller
class ProductService {

    private readonly productDao;

    constructor() {
        this.productDao = new ProductDao();
    }

    @Get("/products")
    public allProducts() {

        const allProducts = ProductDao.findAll()
            .map(product => ({
                id: product.Id,
                title: product.Title,
                image: product.Image,
                price: product.Price
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
            "description": product.Description,
            "image": product.Image,
            "price": product.Price,
            "category": product.Category,
            "manufacturer": product.Manufacturer
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
