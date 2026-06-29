// wx_miniprogram/data/healthcare.js

// 脱敏处理：将用户宝宝接种过疫苗的实际接种日期与接种状态重置为出厂值，保护隐私
const defaultVaccinesList = [
  { name: '乙肝疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '乙肝疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { name: '乙肝疫苗', dose: '第3剂', status: '需补种', actualDate: null },
  { name: '卡介苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '脊灰疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '脊灰疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { name: '脊灰疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { name: '脊灰疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '百白破疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { name: '百白破疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第5剂', status: '未到时间', actualDate: null },
  { name: '麻腮风疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '麻腮风疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: '乙脑减毒活疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '乙脑减毒活疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: 'A群流脑疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: 'A群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: 'A+C群流脑疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { name: 'A+C群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: '甲肝减毒疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { name: '水痘疫苗', dose: '第1剂', status: '推荐接种', actualDate: null },
  { name: '水痘疫苗', dose: '第2剂', status: '未到时间', actualDate: null }
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
