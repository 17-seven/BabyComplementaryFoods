// wx_miniprogram/data/healthcare.js

// 脱敏处理：将用户宝宝接种过疫苗的实际接种日期与接种状态重置为出厂值，保护隐私
const defaultVaccinesList = [
  { id: 'vac_01', name: '乙肝疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_02', name: '乙肝疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { id: 'vac_03', name: '乙肝疫苗', dose: '第3剂', status: '需补种', actualDate: null },
  { id: 'vac_04', name: '卡介苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_05', name: '脊灰疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_06', name: '脊灰疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { id: 'vac_07', name: '脊灰疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { id: 'vac_08', name: '脊灰疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { id: 'vac_09', name: '百白破疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_10', name: '百白破疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { id: 'vac_11', name: '百白破疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { id: 'vac_12', name: '百白破疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { id: 'vac_13', name: '百白破疫苗', dose: '第5剂', status: '未到时间', actualDate: null },
  { id: 'vac_14', name: '麻腮风疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_15', name: '麻腮风疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { id: 'vac_16', name: '乙脑减毒活疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_17', name: '乙脑减毒活疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { id: 'vac_18', name: 'A群流脑疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { id: 'vac_19', name: 'A群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { id: 'vac_20', name: 'A+C群流脑疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { id: 'vac_21', name: 'A+C群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { id: 'vac_22', name: '甲肝减毒疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { id: 'vac_23', name: '水痘疫苗', dose: '第1剂', status: '推荐接种', actualDate: null },
  { id: 'vac_24', name: '水痘疫苗', dose: '第2剂', status: '未到时间', actualDate: null }
];

// 脱敏处理：将季度儿保、大运动评估、就诊记录全部清空，只对真实用户呈现其自己新增的数据
const defaultHealthcares = [];
const defaultAssessments = [];
const defaultClinicalLogs = [];

module.exports = {
  defaultVaccinesList,
  defaultHealthcares,
  defaultAssessments,
  defaultClinicalLogs
};
