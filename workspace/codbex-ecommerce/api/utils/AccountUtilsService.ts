import * as utils from './UtilsService';
import { Address } from '../types/Types'

import { SalesOrderItemRepository } from "codbex-orders/gen/codbex-orders/dao/SalesOrder/SalesOrderItemRepository";
import { ProductRepository } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";


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

    const SakesOrderItemDao = new SalesOrderItemRepository();
    const ProductDao = new ProductRepository();

    const salesOrderItemsResult = SakesOrderItemDao.findAll({
        $filter: {
            equals: {
                SalesOrder: salesorderId
            }
        }
    });

    return salesOrderItemsResult.map(item => {

        const product = ProductDao.findById(item.Product);

        return {
            productId: product.Id,
            quantity: item.Quantity,
            title: product.Title,
            image: product.Image,
            price: product.Price
        }
    });
}