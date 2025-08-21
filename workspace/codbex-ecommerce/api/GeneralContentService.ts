import { Controller, Get, response, request, client } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './utils/UtilsService';
import { Category, Brand, ErrorResponse, CountryResponse } from './types/Types';

@Controller
class GeneralContentService {

    @Get("/content/menu")
    public menuData() {

        const protocol = request.getScheme() + "://";
        const domain = request.getHeader("Host")

        const clientResponse = client.get(`${protocol}${domain}/public/js/documents/api/documents.js/preview?path=/hayat-documents/menu.json`);

        return JSON.parse(clientResponse.text);
    }

    @Get("/content/footer")
    public footerData() {

        const protocol = request.getScheme() + "://";
        const domain = request.getHeader("Host")

        const clientResponse = client.get(`${protocol}${domain}/public/js/documents/api/documents.js/preview?path=/hayat-documents/footer.json`);

        return JSON.parse(clientResponse.text);
    }

    @Get("/categories")
    public categoriesData(): Category[] | ErrorResponse {
        try {
            const categoryQuery = sql.getDialect()
                .select()
                .column('PRODUCTCATEGORY_ID')
                .column('PRODUCTCATEGORY_NAME')
                .column('PRODUCTCATEGORY_PATH')
                .column('COUNT(PRODUCT_ID) PRCOUNT')
                .from('CODBEX_PRODUCTCATEGORY')
                .leftJoin('CODBEX_PRODUCT', 'PRODUCT_CATEGORY = PRODUCTCATEGORY_ID')
                .group('PRODUCTCATEGORY_ID')
                .group('PRODUCTCATEGORY_NAME')
                .build();

            const categoryResult = query.execute(categoryQuery, []) || [];

            if (categoryResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No categories found');
            }

            const categories: Category[] = categoryResult.map(row => ({
                id: String(row.PRODUCTCATEGORY_ID),
                title: row.PRODUCTCATEGORY_NAME,
                image: row.PRODUCTCATEGORY_PATH,
                productCount: row.PRCOUNT
            }));

            return categories;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    @Get("/brands")
    public brandsData(): Brand[] | ErrorResponse {
        try {
            const brandsQuery = sql.getDialect()
                .select()
                .column('MANUFACTURER_ID')
                .column('MANUFACTURER_NAME')
                .from('CODBEX_MANUFACTURER')
                .build();

            const brandsResult = query.execute(brandsQuery) || [];

            if (brandsResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No brands found');
            }

            const allBrands: Brand[] = brandsResult.map(row => ({
                id: String(row.MANUFACTURER_ID),
                name: row.MANUFACTURER_NAME
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
            const countriesQuery = sql.getDialect()
                .select()
                .column('COUNTRY_NAME')
                .column('COUNTRY_CODE3')
                .from('CODBEX_COUNTRY')
                .build();

            const countryResult = query.execute(countriesQuery, []) || [];

            if (countryResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No countries found');
            }

            const countries = countryResult.map(row => ({
                name: row.COUNTRY_NAME,
                code: row.COUNTRY_CODE3
            }));

            return countries;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

}