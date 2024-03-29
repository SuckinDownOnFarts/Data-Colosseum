const knex = require('../../config/pgConn');

const censusVars = [
  'DP05_0001E', 'DP05_0002E', 'DP05_0003E', 'DP05_0005E', 'DP05_0006E', 'DP05_0007E',
  'DP05_0008E', 'DP05_0009E', 'DP05_0010E', 'DP05_0011E', 'DP05_0012E', 'DP05_0013E',
  'DP05_0014E', 'DP05_0015E', 'DP05_0016E', 'DP05_0017E', 'DP05_0018E', 'DP05_0019E',
  'DP05_0020E', 'DP05_0021E', 'DP05_0022E', 'DP05_0024E', 'DP05_0026E', 'DP05_0027E',
  'DP05_0030E', 'DP05_0031E', 'DP05_0035E', 'DP05_0036E', 'DP05_0037E', 'DP05_0038E',
  'DP05_0039E', 'DP05_0040E', 'DP05_0041E', 'DP05_0042E', 'DP05_0043E', 'DP05_0044E',
  'DP05_0045E', 'DP05_0046E', 'DP05_0047E', 'DP05_0048E', 'DP05_0049E', 'DP05_0050E',
  'DP05_0051E', 'DP05_0052E', 'DP05_0053E', 'DP05_0054E', 'DP05_0055E', 'DP05_0056E',
  'DP05_0057E', 'DP05_0087E', 'DP05_0088E', 'DP05_0089E', 'DP02_0025E', 'DP02_0026E',
  'DP02_0027E', 'DP02_0028E', 'DP02_0029E', 'DP02_0030E', 'DP02_0031E', 'DP02_0032E',
  'DP02_0033E', 'DP02_0034E', 'DP02_0035E', 'DP02_0036E', 'DP02_0037E', 'DP02_0038E',
  'DP02_0069E', 'DP02_0070E', 'DP02_0072E', 'DP02_0073E', 'DP02_0074E', 'DP02_0075E',
  'DP02_0076E', 'DP02_0077E', 'DP02_0078E', 'DP02_0089E', 'DP02_0090E', 'DP02_0091E',
  'DP02_0092E', 'DP02_0093E', 'DP02_0094E', 'DP02_0095E', 'DP02_0096E', 'DP02_0097E',
  'DP02_0099E', 'DP02_0100E', 'DP02_0101E', 'DP02_0102E', 'DP02_0103E', 'DP02_0104E',
  'DP02_0124E', 'DP02_0125E', 'DP02_0126E', 'DP02_0127E', 'DP02_0128E', 'DP02_0129E',
  'DP02_0130E', 'DP02_0131E', 'DP02_0132E', 'DP02_0133E', 'DP02_0134E', 'DP02_0135E',
  'DP02_0136E', 'DP02_0137E', 'DP02_0138E', 'DP02_0139E', 'DP02_0140E', 'DP02_0141E',
  'DP02_0142E', 'DP02_0143E', 'DP02_0144E', 'DP02_0145E', 'DP02_0146E', 'DP02_0147E',
  'DP02_0148E', 'DP02_0149E', 'DP02_0150E', 'DP02_0151E'
  ]

module.exports.queryPop = async function (idParam) {
  try {
    const threeMile = await knex.select(censusVars).from('three_m_app_results_2020').where({
      id: idParam
    });
    const fiveMile = await knex.select(censusVars).from('five_m_app_results_2020').where({
      id: idParam
    });
    const tenMile = await knex.select(censusVars).from('ten_m_app_results_2020').where({
      id: idParam
    });
    return [threeMile, fiveMile, tenMile];
  } catch (err) {
    console.log(err.stack);
  };
};
