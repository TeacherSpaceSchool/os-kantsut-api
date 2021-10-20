const { gql, ApolloServer } = require('apollo-server-express');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const pubsub = new RedisPubSub();
module.exports.pubsub = pubsub;
const CashConsumable = require('./cashConsumable');
const Route = require('./route');
const Statistic = require('./statistic');
const Category = require('./category');
const Division = require('./division');
const Error = require('./error');
const Faq = require('./faq');
const Item = require('./item');
const CashExchange = require('./cashExchange');
const Subdivision = require('./subdivision');
const Role = require('./role');
const Unit = require('./unit');
const Seller = require('./seller');
const Balance = require('./balance');
const BalanceHistory = require('./balanceHistory');
const Balance1CHistory = require('./balance1CHistory');
const User = require('./user');
const Application = require('./application');
const Storage = require('./storage');
const Memorandum = require('./memorandum');
const AutoApplication = require('./autoApplication');
const Waybill = require('./waybill');
const ExpenseReport = require('./expenseReport');
const Setting = require('./setting');
const Passport = require('./passport');
const { verifydeuserGQL } = require('../module/passport');
const { GraphQLScalarType } = require('graphql');
const ModelsError = require('../models/error');
const { withFilter } = require('graphql-subscriptions');
const RELOAD_DATA = 'RELOAD_DATA';

const typeDefs = gql`
    scalar Date
    type Data {
       data: String
    }
    type Sort {
        name: String
        field: String
    }
    type Filter {
        name: String
        value: String
    }
    type Currency {
        name: String
        value: Float
    }
    input InputCurrency {
        name: String
        value: Float
    }
    type ReloadData {
        who: ID
        type: String
        ids: [ID]
        roles: [String]
        application: Application
        cashConsumable: CashConsumable 
        waybill: Waybill
        expenseReport: ExpenseReport
        balance: Balance
        cashExchange: CashExchange
        memorandum: Memorandum
    }
  type UsedItems {
    name: String
    unit: String
    price: Float
    count: Float
    currency: String
    comment: String
    status: String
    GUID: String
  }
  input InputItems {
    name: String
    unit: String
    price: Float
    count: Float
    currency: String
    comment: String
    status: String
    GUID: String
  }
  type UsedRoutes {
    role: String
    user: User
    confirmation: Date
    cancel: Date
    comment: String
  }
  input InputRoutes {
    role: String
    user: ID
    confirmation: Date
    cancel: Date
    comment: String
  }
    ${Error.type}
    ${Route.type}
    ${Statistic.type}
    ${CashConsumable.type}
    ${Faq.type}
    ${Passport.type}
    ${Category.type}
    ${Item.type}
    ${CashExchange.type}
    ${Subdivision.type}
    ${Division.type}
    ${Role.type}
    ${Unit.type}
    ${Seller.type}
    ${Balance.type}
    ${BalanceHistory.type}
    ${Balance1CHistory.type}
    ${User.type}
    ${AutoApplication.type}
    ${Storage.type}
    ${Application.type}
    ${Memorandum.type}
    ${Waybill.type}
    ${ExpenseReport.type}
    ${Setting.type}
    type Mutation {
        ${Error.mutation}
        ${Faq.mutation}
        ${Category.mutation}
        ${Passport.mutation}
        ${Item.mutation}
        ${CashExchange.mutation}
        ${Subdivision.mutation}
        ${Division.mutation}
        ${Route.mutation}
        ${Statistic.mutation}
        ${CashConsumable.mutation}
        ${Role.mutation}
        ${Unit.mutation}
        ${Seller.mutation}
        ${User.mutation}
        ${AutoApplication.mutation}
        ${Application.mutation}
        ${Memorandum.mutation}
        ${Waybill.mutation}
        ${ExpenseReport.mutation}
        ${Setting.mutation}
    }
    type Query {
        ${Error.query}
        ${Faq.query}
        ${Category.query}
        ${Passport.query}
        ${Item.query}
        ${CashExchange.query}
        ${Subdivision.query}
        ${Division.query}
        ${Route.query}
        ${Statistic.query}
        ${CashConsumable.query}
        ${Role.query}
        ${Unit.query}
        ${Seller.query}
        ${Balance.query}
        ${BalanceHistory.query}
        ${Balance1CHistory.query}
        ${User.query}
        ${AutoApplication.query}
        ${Storage.query}
        ${Application.query}
        ${Memorandum.query}
        ${Waybill.query}
        ${ExpenseReport.query}
        ${Setting.query}
    }
    type Subscription {
        reloadData: ReloadData
    }
`;

const resolvers = {
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return new Date(value).getTime();
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(ast.value)
            }
            return null;
        },
    }),
    Query: {
        ...Error.resolvers,
        ...Faq.resolvers,
        ...Passport.resolvers,
        ...Category.resolvers,
        ...Item.resolvers,
        ...CashExchange.resolvers,
        ...Subdivision.resolvers,
        ...CashConsumable.resolvers,
        ...Route.resolvers,
        ...Statistic.resolvers,
        ...Division.resolvers,
        ...Role.resolvers,
        ...User.resolvers,
        ...AutoApplication.resolvers,
        ...Storage.resolvers,
        ...Application.resolvers,
        ...Memorandum.resolvers,
        ...Waybill.resolvers,
        ...ExpenseReport.resolvers,
        ...Setting.resolvers,
        ...Unit.resolvers,
        ...Seller.resolvers,
        ...Balance.resolvers,
        ...BalanceHistory.resolvers,
        ...Balance1CHistory.resolvers,
    },
    Mutation: {
        ...Error.resolversMutation,
        ...Faq.resolversMutation,
        ...Category.resolversMutation,
        ...Passport.resolversMutation,
        ...Item.resolversMutation,
        ...CashExchange.resolversMutation,
        ...Subdivision.resolversMutation,
        ...CashConsumable.resolversMutation,
        ...Route.resolversMutation,
        ...Statistic.resolversMutation,
        ...Division.resolversMutation,
        ...Role.resolversMutation,
        ...Unit.resolversMutation,
        ...Seller.resolversMutation,
        ...User.resolversMutation,
        ...AutoApplication.resolversMutation,
        ...Application.resolversMutation,
        ...Memorandum.resolversMutation,
        ...Waybill.resolversMutation,
        ...ExpenseReport.resolversMutation,
        ...Setting.resolversMutation,
    },
    Subscription: {
        reloadData: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(RELOAD_DATA),
                (payload, variables, {user} ) => {
                    return (
                        user&&user.role&&user._id&&user._id.toString()!==payload.reloadData.who&&
                        (
                            payload.reloadData.roles.includes(user.role)||
                            payload.reloadData.ids.toString().includes(user._id.toString())
                        )
                    )
                },
            )
        },
    }
};

const run = (app)=>{
    const server = new ApolloServer({
        playground: false,
        typeDefs,
        resolvers,
        subscriptions: {
            keepAlive: 1000,
            onConnect: async (connectionParams) => {
                if (connectionParams&&connectionParams.authorization) {
                    let user = await verifydeuserGQL({headers: {authorization: connectionParams.authorization}}, {})
                    return {
                        user: user,
                    }
                }
                else return {
                    user: {}
                }
                //throw new Error('Missing auth token!');
            },
            onDisconnect: (webSocket, context) => {
                // ...
            },
        },
        context: async (ctx) => {
            console.log('index0', !!ctx.connection, !!ctx, !!ctx.req)
            if (ctx.connection) {
                return ctx.connection.context;
            }
            else if(ctx&&ctx.req) {
                console.log('index1')
                let user = await verifydeuserGQL(ctx.req, ctx.res)
                console.log('index2')
                return {req: ctx.req, res: ctx.res, user: user};
            }
        },
        formatError: (err) => {
            console.error(err)

            //logger.info(err.message);
            let _object = new ModelsError({
                err: err.message,
                path: err.path
            });
            ModelsError.create(_object)

            return err;
        }
    })
    server.applyMiddleware({ app, path : '/graphql', cors: false })
    return server
    //server.listen().then(({ url }) => {console.log(`🚀  Server ready at ${url}`);});
}

module.exports.run = run;
