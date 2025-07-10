import { Controller, Get } from "sdk/http";
import { query, sql } from 'sdk/db';

@Controller
class ProductService {

    @Get("/categories")
    public categoriesData() {

        const sql = `
        SELECT 
            pc.PRODUCTCATEGORY_ID AS ID,
            pc.PRODUCTCATEGORY_NAME AS NAME,
            COUNT(p.PRODUCT_ID) AS PRCOUNT
        FROM 
            CODBEX_PRODUCTCATEGORY pc
        LEFT JOIN 
            CODBEX_PRODUCT p 
            ON p.PRODUCT_CATEGORY = pc.PRODUCTCATEGORY_ID
        GROUP BY 
            pc.PRODUCTCATEGORY_ID, 
            pc.PRODUCTCATEGORY_NAME;
 `;
        const result = query.execute(sql);

        const categories = result.map(row => ({
            id: row.ID,
            title: row.NAME,
            productCount: row.PRCOUNT
        }));

        return categories;
    }

    @Get("/brands")
    public brandsData() {
        const sqlQuery = sql.getDialect()
            .select()
            .column('MANUFACTURER_ID')
            .column('MANUFACTURER_NAME')
            .from('CODBEX_MANUFACTURER')
            .build();

        const result = query.execute(sqlQuery, []);

        const allBrands = result.map(row => ({
            id: row.MANUFACTURER_ID,
            name: row.MANUFACTURER_NAME
        }));

        return allBrands;
    }

    @Get("/products")
    public allProducts() {

        const productSQL = `
        SELECT 
            PRODUCT_ID AS ID,
            PRODUCT_TITLE AS TITLE,
            PRODUCT_PRICE AS PRICE,
            PRODUCT_CATEGORY AS CATEGORY
        FROM 
            CODBEX_PRODUCT
        LIMIT 30;
`;
        const products = query.execute(productSQL);

        const productIds = products.map(p => p.ID);

        let images = [];
        if (productIds.length > 0) {
            const ids = productIds.map(() => '?').join(', ');

            const imagesSQL = `
    SELECT 
        PRODUCTIMAGE_PRODUCT AS PRODUCTID,
        PRODUCTIMAGE_IMAGELINK AS IMAGELINK,
        PRODUCTIMAGE_ISFEATURE AS ISFEATURE
    FROM 
        CODBEX_PRODUCTIMAGE
    WHERE 
        PRODUCTIMAGE_PRODUCT IN (${ids});
    `;
            images = query.execute(imagesSQL, productIds);
        }

        const imageMap = new Map();
        for (const img of images) {
            const key = img.PRODUCTID;

            if (!imageMap.has(key)) {
                imageMap.set(key, { featuredImage: null, images: [] });
            }
            const entry = imageMap.get(key);
            entry.images.push(img.IMAGELINK);

            if (img.ISFEATURE === true && !entry.featuredImage) {
                entry.featuredImage = img.IMAGELINK;
            }
        }

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.ID) ?? { featuredImage: null, images: [] };
            return {
                id: p.ID,
                title: p.TITLE,
                price: p.PRICE,
                category: p.CATEGORY,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }

    @Get("/product/:productId")
    public productData(_: any, ctx: any) {

        const productId = ctx.pathParameters.productId;

        const productSQL = `
        SELECT 
            PRODUCT_ID AS ID,
            PRODUCT_TITLE AS TITLE,
            PRODUCT_CATEGORY AS CATEGORY,
            PRODUCT_MANUFACTURER AS BRAND,
            PRODUCT_DESCRIPTION AS DESCRIPTION,
            PRODUCT_PRICE AS PRICE
        FROM 
            CODBEX_PRODUCT
        WHERE 
            PRODUCT_ID = ?;
`;

        const imagesSQL = `
        SELECT 
            PRODUCTIMAGE_IMAGELINK AS IMAGELINK,
            PRODUCTIMAGE_ISFEATURE AS ISFEATURE
        FROM 
            CODBEX_PRODUCTIMAGE
        WHERE 
            PRODUCTIMAGE_PRODUCT = ?;
                                        `;

        const productsResult = query.execute(productSQL, [productId]).at(0);
        const imagesResult = query.execute(imagesSQL, [productId]);

        const featuredImage = imagesResult.find(img => img.ISFEATURE === true);

        return {
            "id": productsResult.ID,
            "title": productsResult.TITLE,
            "category": productsResult.CATEGORY,
            "brand": productsResult.BRAND,
            "description": productsResult.DESCRIPTION,
            "price": productsResult.PRICE,
            "featuredImage": featuredImage.IMAGELINK,
            "images": imagesResult.map(img => img.IMAGELINK)
        };
    }

    @Get("/productsByCategory/:categoryId")
    public productByCategory(_: any, ctx: any) {
        const categoryId = ctx.pathParameters.categoryId;

        const productSQL = `
        SELECT 
            PRODUCT_ID AS ID,
            PRODUCT_TITLE AS TITLE,
            PRODUCT_PRICE AS PRICE,
            PRODUCT_CATEGORY AS CATEGORY
        FROM 
            CODBEX_PRODUCT
        WHERE 
            PRODUCT_CATEGORY = ?;
                                    `;
        const products = query.execute(productSQL, [categoryId]);

        const productIds = products.map(p => p.ID);

        let images = [];
        if (productIds.length > 0) {
            const ids = productIds.map(() => '?').join(', ');

            const imagesSQL = `
        SELECT 
            PRODUCTIMAGE_PRODUCT AS PRODUCTID,
            PRODUCTIMAGE_IMAGELINK AS IMAGELINK,
            PRODUCTIMAGE_ISFEATURE AS ISFEATURE
        FROM 
            CODBEX_PRODUCTIMAGE
        WHERE 
            PRODUCTIMAGE_PRODUCT IN (${ids});
    `;

            images = query.execute(imagesSQL, productIds);
        }

        const imageMap = new Map();
        for (const img of images) {
            const key = img.PRODUCTID;

            if (!imageMap.has(key)) {
                imageMap.set(key, { featuredImage: null, images: [] });
            }
            const entry = imageMap.get(key);
            entry.images.push(img.IMAGELINK);

            if (img.ISFEATURE === true && !entry.featuredImage) {
                entry.featuredImage = img.IMAGELINK;
            }
        }

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.ID) ?? { featuredImage: null, images: [] };
            return {
                id: p.ID,
                title: p.TITLE,
                price: p.PRICE,
                category: p.CATEGORY,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }
}
