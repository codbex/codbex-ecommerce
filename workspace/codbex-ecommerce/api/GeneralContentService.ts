import { Controller, Get, response } from "sdk/http";
import * as utils from './utils/UtilsService';
import { cmis } from "sdk/cms";
import { Category, Brand, ErrorResponse, CountryResponse, Company } from './types/Types';

import { ManufacturerRepository as ManufacturerDao } from "codbex-partners/gen/codbex-partners/dao/Manufacturers/ManufacturerRepository";
import { CountryRepository as CountryDao } from "codbex-countries/gen/codbex-countries/dao/Settings/CountryRepository";
import { ProductCategoryRepository as ProductCategoryDao } from "codbex-products/gen/codbex-products/dao/Settings/ProductCategoryRepository";
import { ProductRepository as ProductDao } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { CompanyRepository as CompanyDao } from "codbex-companies/gen/codbex-companies/dao/Companies/CompanyRepository";

@Controller
class GeneralContentService {

    private readonly manufacturerDao;
    private readonly countryDao;
    private readonly productCategoryDao;
    private readonly productDao;
    private readonly companyDao;

    constructor() {
        this.manufacturerDao = new ManufacturerDao();
        this.countryDao = new CountryDao();
        this.productCategoryDao = new ProductCategoryDao();
        this.productDao = new ProductDao();
        this.companyDao = new CompanyDao();
    }

    @Get("/content/menu")
    public menuData() {
        return this.getContent("hayat-documents", "menu.json");

    }

    @Get("/content/footer")
    public footerData() {
        return this.getContent("hayat-documents", "footer.json");
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

    @Get("/company")
    public companyData(): Company[] | ErrorResponse {
        try {
            const company = this.companyDao.findById(1);

            if (!company) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'Cannot find company');
            }

            return {
                name: company.Name,
                email: company.Email,
                address: company.Address
            };
        }
        catch (error: any) {
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

    private getContent(folder: string, file: string) {
        try {
            const session = cmis.getSession();
            const documentPath = `/${folder}/${file}`;

            const document = session.getObjectByPath(documentPath);

            const contentStream = document.getContentStream();
            if (!contentStream) {
                response.setStatus(response.INTERNAL_SERVER_ERROR);
                return utils.createErrorResponse(
                    response.INTERNAL_SERVER_ERROR,
                    `${documentPath} has no content`
                );
            }

            const text = contentStream.getStream().readText();
            return JSON.parse(text);

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

}

