import { Controller, Get, response, client } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './UtilsService';
import { Money, Category, Brand, ErrorResponse } from './types/Types';

@Controller
class ProductService {

    @Get("/content/footer")
    public footerData() {
        const resp = client.get('http://localhost:8080/public/js/documents/api/documents.js/preview?path=/hayat-documents/footer.json');

        return JSON.parse(resp.text);
    }

    @Get("/categories")
    public categoriesData(): Category[] | ErrorResponse {
        try {
            const categoryQuery = sql.getDialect()
                .select()
                .column('PRODUCTCATEGORY_ID')
                .column('PRODUCTCATEGORY_NAME')
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
                productCount: row.PRCOUNT
            }));

            return categories;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    @Get("/brands")
    public getBrands(): Brand[] | ErrorResponse {
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
    public countriesData(): { name: string; code: string }[] | ErrorResponse {
        try {
            const sqlQuery = sql.getDialect()
                .select()
                .column('COUNTRY_NAME')
                .column('COUNTRY_CODE3')
                .from('CODBEX_COUNTRY')
                .build();

            const countryResult = query.execute(sqlQuery, []) || [];

            if (countryResult.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(response.BAD_REQUEST, 'Something went wrong', 'No countries found');
            }

            const allCountries = countryResult.map(row => ({
                name: row.COUNTRY_NAME,
                code: row.COUNTRY_CODE3
            }));

            return allCountries;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(response.INTERNAL_SERVER_ERROR, 'Something went wrong', error);
        }
    }

    @Get("/products")
    public allProducts() {

        const productQuery = sql.getDialect()
            .select()
            .column('PRODUCT_ID')
            .column('PRODUCT_TITLE')
            .column('PRODUCT_CATEGORY')
            .column('PRODUCT_SHORTDESCRIPTION')
            .column('PRODUCT_PRICE')
            .column('PRODUCT_CURRENCY')
            .from('CODBEX_PRODUCT')
            .limit(30)
            .build();

        const products = query.execute(productQuery);

        const productIds = products.map(p => p.PRODUCT_ID);

        const imageMap = fetchImagesForProducts(productIds);
        const availabilityMap = fetchAvailabilityForProducts(productIds);
        const currencyMap = mapProductIdToCurrencyCode(products);

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.PRODUCT_ID) ?? { featuredImage: null, images: [] };
            const isAvailable = availabilityMap.get(p.PRODUCT_ID) ?? false;
            const currencyCode = currencyMap.get(p.PRODUCT_ID) ?? 'UNKNOWN';

            return {
                id: String(p.PRODUCT_ID),
                title: p.PRODUCT_TITLE,
                shortDescription: p.PRODUCT_SHORTDESCRIPTION,
                price: {
                    amount: p.PRODUCT_PRICE,
                    currency: currencyCode,
                } as Money,
                category: p.PRODUCT_CATEGORY,
                availableForSale: isAvailable,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }

    @Get("/product/:productId")
    public productData(_: any, ctx: any) {
        const productId = ctx.pathParameters.productId;

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
            .from('CODBEX_PRODUCTATTRIBUTE pa')
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
        const imagesResult = query.execute(imagesQuery, [productId]);
        const availabilityResult = query.execute(availabilityQuery, [productId]).at(0);
        const attributeResult = query.execute(attributeQuery, [productId]);

        const featuredImage = imagesResult.find(img => img.PRODUCTIMAGE_ISFEATURE === true);

        const currencyCode = getCurrencyCodeForSingleProduct(productsResult.PRODUCT_CURRENCY);

        const groupedAttributes: Record<string, { name: string; value: string }[]> = {};
        for (const attr of attributeResult) {
            const groupName = attr.PRODUCTATTRIBUTEGROUP_NAME || "Ungrouped";

            if (!groupedAttributes[groupName]) {
                groupedAttributes[groupName] = [];
            }

            groupedAttributes[groupName].push({
                name: attr.PRODUCTATTRIBUTE_NAME,
                value: attr.PRODUCTATTRIBUTE_VALUE
            });
        }

        return {
            id: String(productsResult.PRODUCT_ID),
            title: productsResult.PRODUCT_TITLE,
            category: productsResult.PRODUCT_CATEGORY,
            brand: productsResult.PRODUCT_MANUFACTURER,
            description: productsResult.PRODUCT_DESCRIPTION,
            shortDescription: productsResult.PRODUCT_SHORTDESCRIPTION,
            price: {
                amount: productsResult.PRODUCT_PRICE,
                currency: currencyCode,
            } as Money,
            availableForSale: availabilityResult.PRODUCTAVAILABILITY_QUANTITY > 0,
            featuredImage: featuredImage ? featuredImage.PRODUCTIMAGE_IMAGELINK : null,
            images: imagesResult.map(img => img.PRODUCTIMAGE_IMAGELINK),
            attributes: groupedAttributes
        };
    }

    @Get("/productsByCategory/:categoryId")
    public productByCategory(_: any, ctx: any) {
        const categoryId = ctx.pathParameters.categoryId;

        const productQuery = sql.getDialect()
            .select()
            .column('PRODUCT_ID')
            .column('PRODUCT_TITLE')
            .column('PRODUCT_PRICE')
            .column('PRODUCT_SHORTDESCRIPTION')
            .column('PRODUCT_CURRENCY')
            .column('PRODUCT_CATEGORY')
            .from('CODBEX_PRODUCT')
            .where('PRODUCT_CATEGORY = ?')
            .build();

        const products = query.execute(productQuery, [categoryId]);

        const productIds = products.map(p => p.PRODUCT_ID);

        const imageMap = fetchImagesForProducts(productIds);
        const availabilityMap = fetchAvailabilityForProducts(productIds);
        const currencyMap = mapProductIdToCurrencyCode(products);

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.PRODUCT_ID) ?? { featuredImage: null, images: [] };
            const isAvailable = availabilityMap.get(p.PRODUCT_ID) ?? false;
            const currencyCode = currencyMap.get(p.PRODUCT_ID) ?? 'UNKNOWN';

            return {
                id: String(p.PRODUCT_ID),
                title: p.PRODUCT_TITLE,
                shortDescription: p.PRODUCT_SHORTDESCRIPTION,
                price: {
                    amount: p.PRODUCT_PRICE,
                    currency: currencyCode,
                } as Money,
                category: p.PRODUCT_CATEGORY,
                availableForSale: isAvailable,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }

}

function fetchImagesForProducts(productIds: number[]) {
    if (productIds.length === 0) {
        return new Map();
    }

    const placeholders = productIds.map(() => '?').join(',');

    const imagesQuery = sql.getDialect()
        .select()
        .column('PRODUCTIMAGE_PRODUCT')
        .column('PRODUCTIMAGE_IMAGELINK')
        .column('PRODUCTIMAGE_ISFEATURE')
        .from('CODBEX_PRODUCTIMAGE')
        .where(`PRODUCTIMAGE_PRODUCT IN (${placeholders})`)
        .build();

    const images = query.execute(imagesQuery, productIds);

    const imageMap = new Map();

    for (const img of images) {
        const key = img.PRODUCTIMAGE_PRODUCT;

        if (!imageMap.has(key)) {
            imageMap.set(key, { featuredImage: null, images: [] });
        }
        const entry = imageMap.get(key);
        entry.images.push(img.PRODUCTIMAGE_IMAGELINK);

        if (img.PRODUCTIMAGE_ISFEATURE === true && !entry.featuredImage) {
            entry.featuredImage = img.PRODUCTIMAGE_IMAGELINK;
        }
    }

    return imageMap;
}

function fetchAvailabilityForProducts(productIds: string[]): Map<string, boolean> {
    const availabilityRows = query.execute(
        sql.getDialect()
            .select()
            .column('PRODUCTAVAILABILITY_PRODUCT')
            .column('PRODUCTAVAILABILITY_QUANTITY')
            .from('CODBEX_PRODUCTAVAILABILITY')
            .where(`PRODUCTAVAILABILITY_PRODUCT IN (${productIds})`)
            .build()
    );

    const map = new Map<string, boolean>();
    for (const row of availabilityRows) {
        map.set(row.PRODUCTAVAILABILITY_PRODUCT, row.PRODUCTAVAILABILITY_QUANTITY > 0);
    }

    return map;
}

function mapProductIdToCurrencyCode(products: any): Map<number, string> {

    const currencyIds = products.map(p => p.PRODUCT_CURRENCY);

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_ID')
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where(`CURRENCY_ID IN (${currencyIds.map(() => '?').join(',')})`)
        .build();

    const currencies = query.execute(currencyQuery, currencyIds);

    const currencyMap = new Map(currencies.map(c => [c.CURRENCY_ID, c.CURRENCY_CODE]));

    return new Map(
        products.map(p => [p.PRODUCT_ID, currencyMap.get(p.PRODUCT_CURRENCY)])
    );
}

function getCurrencyCodeForSingleProduct(currencyId: number) {

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where('CURRENCY_ID = ?')
        .build();

    const result = query.execute(currencyQuery, [currencyId]);
    return result.length > 0 ? result[0].CURRENCY_CODE : null;
}


