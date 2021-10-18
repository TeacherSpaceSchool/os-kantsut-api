const Application = require('../models/application');

const type = `
    type Statistic {
        columns: [String]
        row: [StatisticData]
    }
    type StatisticData {
        _id: ID
        data: [String]
    }
    type ChartStatistic {
        label: String
        data: [[String]]
    }
    type GeoStatistic {
        client: ID
        address: [String]
        data: [String]
    }
    type ChartStatisticAll {
        all: Int
        chartStatistic: [ChartStatistic]
    }
`;

const query = `
    statisticSupplier(dateStart: Date, dateType: String): Statistic
`;

const mutation = '';

const resolvers = {
    statisticSupplier: async(parent, { dateStart, dateType  }, {user}) => {
        if(['admin', 'менеджер', 'снабженец'].includes(user.role)&&user.checkedPinCode){
            let dateEnd
            if(dateStart){
                dateStart= new Date(dateStart)
                dateStart.setHours(3, 0, 0, 0)
                if(dateType==='year') {
                    dateStart.setMonth(0)
                    dateStart.setDate(1)
                    dateEnd = new Date(dateStart)
                    dateEnd.setFullYear(dateEnd.getFullYear() + 1)
                }
                else if(dateType==='day') {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                else {
                    dateStart.setDate(1)
                    dateEnd = new Date(dateStart)
                    dateEnd.setMonth(dateEnd.getMonth()+1)
                }
            }
            let statistic = {}
            let data = await Application.find(
                {
                    ...'снабженец'===user.role?{supplier: user._id}:{},
                    $and: [
                        dateStart?{createdAt: {$gte: dateStart}}:{},
                        dateEnd?{createdAt: {$lt: dateEnd}}:{}
                    ]
                }
            )
                .select('status supplier')
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .lean()
            for(let i=0; i<data.length; i++) {
                if (!statistic[data[i].supplier._id])
                    statistic[data[i].supplier._id] = {
                        accept: 0,
                        cancel: 0,
                        process: 0,
                        name: data[i].supplier.name
                    }
                if(data[i].status==='выполнен') statistic[data[i].supplier._id].accept++
                else if(['обработка', 'принят', 'оплачен'].includes(data[i].status)) statistic[data[i].supplier._id].process++
                else if(data[i].status==='отмена') statistic[data[i].supplier._id].cancel++
            }
            const keys = Object.keys(statistic)
            data = []
            let acceptAll = 0
            let cancelAll = 0
            let processAll = 0
            for(let i=0; i<keys.length; i++){
                acceptAll += statistic[keys[i]].accept
                cancelAll += statistic[keys[i]].cancel
                processAll += statistic[keys[i]].process
                data.push({
                    _id: keys[i],
                    data: [
                        statistic[keys[i]].name,
                        statistic[keys[i]].accept,
                        statistic[keys[i]].process,
                        statistic[keys[i]].cancel
                    ]
                })
            }
            data = data.sort(function(a, b) {
                return b.data[1] - a.data[1]
            });
            data = [
                {
                    _id: 'All',
                    data: [
                        acceptAll,
                        processAll,
                        cancelAll,
                    ]
                },
                ...data
            ]
            return {
                columns: ['имя', 'выполнен(шт)', 'в процессе(сом)', 'отмена(шт)'],
                row: data
            };
        }
    },
};

const resolversMutation = {
}

module.exports.type = type;
module.exports.query = query;
module.exports.mutation = mutation;
module.exports.resolversMutation = resolversMutation;
module.exports.resolvers = resolvers;