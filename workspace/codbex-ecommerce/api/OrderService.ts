import { Controller, Get } from "sdk/http";
import { query, sql } from 'sdk/db';

type Money = {
    amount: number;
    currency: string;
};

@Controller
class OrderSetrvice {

    @Get("/account/orders")
    public ordersData() {

        const salesOrderQuery = sql.getDialect()
            .select()
            .column('SALESORDER_ID')
            .column('SALESORDER_DATE')
            .column('SALESORDER_STATUS')
            .column('SALESORDER_CURRENCY')
            .column('SALESORDER_TOTAL')
            .from('CODBEX_SALESORDER')
            .where('SALESORDER_CUSTOMER = 1')
            .build();

        const salesOrderResults = query.execute(salesOrderQuery, []);

        const salesOrders = salesOrderResults.map(row => {
            const currencyCode = mapCurrencyCode(row.SALESORDER_CURRENCY);
            const status = mapStatus(row.SALESORDER_STATUS);

            return {
                id: String(row.SALESORDER_ID),
                creationDate: new Date(row.SALESORDER_DATE).toISOString(),
                status: status,
                totalAmount: {
                    amount: row.SALESORDER_TOTAL,
                    currency: currencyCode,
                } as Money
            };
        });

        return salesOrders;
    }
}

function mapStatus(statusId: number) {
    const salesOrderStatusQuery = sql.getDialect()
        .select()
        .column('SALESORDERSTATUS_ID')
        .column('SALESORDERSTATUS_NAME')
        .from('CODBEX_SALESORDERSTATUS')
        .where(`SALESORDERSTATUS_ID = ?`)
        .build();

    const salesOrderStatusResult = query.execute(salesOrderStatusQuery, [statusId]);

    return salesOrderStatusResult[0].SALESORDERSTATUS_NAME;
}

function mapCurrencyCode(currencyId: number) {

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_ID')
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where(`CURRENCY_ID = ?`)
        .build();

    const currencyResult = query.execute(currencyQuery, [currencyId]);

    return currencyResult[0].CURRENCY_CODE;
}