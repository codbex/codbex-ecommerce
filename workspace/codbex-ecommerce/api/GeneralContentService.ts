import { Controller, Get, response, request, client } from "sdk/http";
import * as utils from './utils/UtilsService';
import { Category, Brand, ErrorResponse, CountryResponse } from './types/Types';

import { ManufacturerRepository as ManufacturerDao } from "codbex-partners/gen/codbex-partners/dao/Manufacturers/ManufacturerRepository";
import { CountryRepository as CountryDao } from "codbex-countries/gen/codbex-countries/dao/Settings/CountryRepository";
import { ProductCategoryRepository as ProductCategoryDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductCategoryRepository";
import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";


@Controller
class GeneralContentService {

    private readonly manufacturerDao;
    private readonly countryDao;
    private readonly productCategoryDao;
    private readonly productDao;

    constructor() {
        this.manufacturerDao = new ManufacturerDao();
        this.countryDao = new CountryDao();
        this.productCategoryDao = new ProductCategoryDao();
        this.productDao = new ProductDao();
    }

    @Get("/content/menu")
    public menuData() {
        this.getContent("menu.json");

    }

    @Get("/content/footer")
    public footerData() {
        this.getContent("footer.json");
    }

    @Get("/categories")
    public categoriesData(): Category[] | ErrorResponse {
        try {
            const allCategories = this.productCategoryDao.findAll();

            if (allCategories.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No categories found');
            }

            const categories: Category[] = allCategories.map(row => {

                const countOfProducts = this.productDao.findAll({
                    $filter: {
                        equals: {
                            Category: row.Id
                        }
                    }
                }).length;

                return {
                    id: String(row.Id),
                    title: row.Name,
                    image: row.Path,
                    productCount: countOfProducts
                };
            });

            return categories;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    @Get("/brands")
    public brandsData(): Brand[] | ErrorResponse {
        try {
            const brandsResult = this.manufacturerDao.findAll();

            if (brandsResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No brands found');
            }

            const allBrands: Brand[] = brandsResult.map(row => ({
                id: String(row.Id),
                name: row.Name
            }));

            return allBrands;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    @Get("/countries")
    public countriesData(): CountryResponse[] | ErrorResponse {
        try {
            const countryResult = this.countryDao.findAll();

            if (countryResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No countries found');
            }

            const countries = countryResult.map(row => ({
                name: row.Name,
                code: row.Code3
            }));

            return countries;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    private getContent(file: string) {
        const protocol = request.getScheme() + "://";
        const domain = request.getHeader("Host")

        const clientResponse = client.get(`${protocol}${domain}/public/js/documents/api/documents.js/preview?path=/hayat-documents/${file}`);

        return JSON.parse(clientResponse.text);
    }

}