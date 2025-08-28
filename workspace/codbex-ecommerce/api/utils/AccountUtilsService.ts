import { query, sql } from 'sdk/db';
import * as utils from './UtilsService';
import { Address } from '../types/Types'

export function mapAddresses(allAddresses: any[]): { shippingAddress: Address[]; billingAddress: Address[]; } {

    const mappedAddresses = allAddresses.map(row => {

        const countryCode = utils.getCountryCode(row.Country);
        const countryName = utils.getCountryName(row.Country);
        const city = utils.getCityName(row.City);

        return {
            id: String(row.Id),
            firstName: row.FirstName,
            lastName: row.LastName,
            country: countryCode,
            countryName: countryName,
            addressLine1: row.AddressLine1,
            addressLine2: row.AddressLine2,
            city: city,
            postalCode: row.PostalCode,
            phoneNumber: row.Phone,
            email: row.Email,
            addressType: String(row.AddressType)
        };
    });

    const shippingAddress: Address[] = mappedAddresses
        .filter(a => a.addressType === "1")
        .map(({ addressType, ...rest }) => rest);

    const billingAddress: Address[] = mappedAddresses
        .filter(a => a.addressType === "2")
        .map(({ addressType, ...rest }) => rest);

    return {
        shippingAddress,
        billingAddress
    };
}

export function getSalesOrderItems(salesorderId: number) {

    const salesOrderItemsQuery = sql.getDialect()
        .select()
        .column('SALESORDERITEM_ID')
        .column('SALESORDERITEM_QUANTITY')
        .column('SALESORDERITEM_PRODUCT')
        .from('CODBEX_SALESORDERITEM')
        .where('SALESORDERITEM_SALESORDER = ?')
        .build();

    const productsQuery = sql.getDialect()
        .select()
        .column('PRODUCT_IMAGE')
        .column('PRODUCT_TITLE')
        .column('PRODUCT_PRICE')
        .from('CODBEX_PRODUCT')
        .where('PRODUCT_ID = ?')
        .build();

    const salesOrderItemResult = query.execute(salesOrderItemsQuery, [salesorderId]);

    return salesOrderItemResult.map(item => {
        const productRes = query.execute(productsQuery, [item.SALESORDERITEM_PRODUCT]);

        return {
            productId: String(item.SALESORDERITEM_ID),
            quantity: item.SALESORDERITEM_QUANTITY,
            title: productRes[0].PRODUCT_TITLE,
            image: productRes[0].PRODUCT_IMAGE,
            price: productRes[0].PRODUCT_PRICE
        }
    });
}