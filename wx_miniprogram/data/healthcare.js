// wx_miniprogram/data/healthcare.js

// 1. 实装查验疫苗接种列表数据
const defaultVaccinesList = [
  { name: '乙肝疫苗', dose: '第1剂', status: '已接种', actualDate: '2025-12-12' },
  { name: '乙肝疫苗', dose: '第2剂', status: '已接种', actualDate: '2026-01-30' },
  { name: '乙肝疫苗', dose: '第3剂', status: '需补种', actualDate: null },
  { name: '卡介苗', dose: '第1剂', status: '已接种', actualDate: '2026-03-23' },
  { name: '脊灰疫苗', dose: '第1剂', status: '已接种', actualDate: '2026-03-03' },
  { name: '脊灰疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { name: '脊灰疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { name: '脊灰疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第1剂', status: '已接种', actualDate: '2026-05-13' },
  { name: '百白破疫苗', dose: '第2剂', status: '需补种', actualDate: null },
  { name: '百白破疫苗', dose: '第3剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第4剂', status: '未到时间', actualDate: null },
  { name: '百白破疫苗', dose: '第5剂', status: '未到时间', actualDate: null },
  { name: '麻腮风疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '麻腮风疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: '乙脑减毒活疫苗', dose: '第1剂', status: '需补种', actualDate: null },
  { name: '乙脑减毒活疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: 'A群流脑疫苗', dose: '第1剂', status: '已接种', actualDate: '2026-06-12' },
  { name: 'A群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: 'A+C群流脑疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { name: 'A+C群流脑疫苗', dose: '第2剂', status: '未到时间', actualDate: null },
  { name: '甲肝减毒疫苗', dose: '第1剂', status: '未到时间', actualDate: null },
  { name: '水痘疫苗', dose: '第1剂', status: '推荐接种', actualDate: null },
  { name: '水痘疫苗', dose: '第2剂', status: '未到时间', actualDate: null }
];

// 2. 真实历史季度儿保数据
const defaultHealthcares = [
  { id: 7, date: '2026-06-18', height: 78.0, weight: 9.85, headCircumference: 45.5, feedback: '儿保体检，各指标发育均符合中位数以上。大腿后侧仍微紧。' },
  { id: 6, date: '2026-05-20', height: 76.0, weight: 9.60, headCircumference: 45.0, feedback: '各项发育良好。注意多带去户外运动，促进维生素D合成。' },
  { id: 5, date: '2026-03-23', height: 72.5, weight: 8.50, headCircumference: 44.0, feedback: '接种卡介苗，身高体重达标。建议添加辅食排敏。' },
  { id: 4, date: '2026-01-20', height: 68.0, weight: 7.85, headCircumference: 42.0, feedback: '骨骼硬朗，注意观察大拇脚趾甲发白空甲现象。' },
  { id: 3, date: '2025-11-20', height: 65.0, weight: 7.30, headCircumference: 41.0, feedback: '进入翻身训练大运动发育期，看护注意防坠床。' },
  { id: 2, date: '2025-09-20', height: 62.0, weight: 6.70, headCircumference: 40.0, feedback: '大运动大腿发紧，巴方评估建议配合春雨大运动康复干预。' },
  { id: 1, date: '2025-07-20', height: 58.0, weight: 5.50, headCircumference: 38.0, feedback: '满月儿保体检，基础生理信息发育符合健康合格标准。' }
];

// 3. 发育评估
const defaultAssessments = [
  { 
    id: 4, 
    date: '2026-05-12', 
    name: '新生儿生长随访及格里菲斯 (Griffiths) 发育评估', 
    doctor: '杜亚罗', 
    result: '纠正月龄 12.5 月（实际 15 月，早产 29w+6，出生体重 1137g）。体格发育：体重 7.815kg（百分位 12.7），身长 73.0cm（百分位 28.4），头围 40.0cm（百分位 <1，Z值 -3.68）。发育商（DQ）：粗大运动 64（发育至 8m 水平），个人社会 64（8m 水平），听力语言 84（10.5m 水平），手眼协调 76（9.5m 水平），视觉表现 72（9m 水平）。整体诊断印象为：头围小、体重低，核心力量不稳，下肢肌张力略高，精细运动落后。', 
    intervention: '医生建议：加强日常营养补充，并继续进行针对性大运动与精细运动的康复训练。' 
  },
  { 
    id: 3, 
    date: '2025-12-02', 
    name: 'Alberta 婴儿运动量表 (AIMS) 复查报告', 
    doctor: '巴方 王超', 
    result: '纠正月龄 7m+12d，总分 15 分，发育百分位 <P5。仰卧位：头中线可，双手中线够物可见，肩前屈 <90 度，拇指内扣，双下肢肌张力高，可两侧轴性翻身。俯卧位：肘支撑抬头转头可，未见双手支撑与打圈。坐位：拉坐（+），短暂独坐，侧方保护（-）。站立位：未见支撑。', 
    intervention: '医生建议：继续进行家庭干预加专业机构康复训练。计划于 2026-01-30 左右复查。' 
  },
  { 
    id: 2, 
    date: '2025-09-02', 
    name: 'Alberta 婴儿运动量表 (AIMS) 测试报告', 
    doctor: '巴方 李想', 
    result: '纠正月龄 17w+6，总分 12 分，发育百分位 P5-10。仰卧位：双手中线非最优，伸手取物（-），未见手触膝及翻身。俯卧位：肘支撑抬头可，重心转移与中线竖头（-）。坐位：拉坐（-），竖头（-），上肢伸展撑坐，背肌代偿。站立位：部分支撑，对线（-）。整体肌张力稍高，建议排查脑电图。', 
    intervention: '医生建议：开展家庭干预与大运动康复干预。计划于 2025-10-30 左右复诊评估。' 
  },
  { 
    id: 1, 
    date: '2025-07-29', 
    name: '婴儿运动表现测试 (Timp) 测试报告', 
    doctor: '巴方 李想', 
    result: '纠正周龄 12w+6，观察条目得分 4，观察下肢抗重力屈曲弱，内收肌角紧张。', 
    intervention: '医生建议：开展家庭干预、康复指导及 GMs 评估。' 
  }
];

// 4. 25条详细临床病历与预约检查明细
const defaultClinicalLogs = [
  { id: 24, name: '眼睛复查', date: '2026-09-15', desc1: '四院 崔丽红', desc2: '三个月后散瞳复查', result: '', status: '未完成' },
  { id: 23, name: '眼睛检查', date: '2026-06-17', desc1: '四院 崔丽红', desc2: '眼部超声，验光', result: '右眼偏斜。治疗：左眼遮盖4小时/天，三个月后散瞳复查。', status: '已完成' },
  { id: 22, name: '生长发育评估(看结果)', date: '2026-05-12', desc1: '毛健', desc2: 'A座三楼新生儿科门诊', result: '1. 纽荃星配方奶粉；2. AD吃到1岁半；3. 脑电正常；4. 建议换全面干预机构。', status: '已完成' },
  { id: 21, name: '生长发育评估(复查)', date: '2026-05-09', desc1: '毛健', desc2: '抽血检查', result: '医生开出脑电图及格里菲斯测评。', status: '已完成' },
  { id: 20, name: '体检', date: '2026-03-01', desc1: '河马儿科 姜春颖', desc2: '年龄：1岁11天（纠正12月龄）', result: '1. 生长发育落后；2. 视力筛查存在注视偏斜，建议减少电子产品多远眺；3. 骨密度检测不足（-1.68）。建议使用初敏润肤乳保湿，3-6月后定期复查。', status: '已完成' },
  { id: 19, name: '生长发育评估（复查）', date: '2026-02-03', desc1: '毛健', desc2: '看生长情况', result: '由于早产原因需定期评估。', status: '未完成' },
  { id: 18, name: '运动/神经系统发育评估（复查）', date: '2025-12-02', desc1: '巴方', desc2: '复查运动发育', result: '双下肢肌张力高，可两侧轴性翻身，未见手支撑与打圈。建议去春雨中心进行康复治疗。', status: '已完成' },
  { id: 17, name: '生长发育评估（复查）', date: '2025-12-02', desc1: '毛健', desc2: '看发育情况', result: '脑电正常，便秘吃蔬菜汁，康复继续。', status: '已完成' },
  { id: 16, name: '脑电图', date: '2025-11-24', desc1: '医院检查', desc2: '预约脑电图', result: '界线性婴儿脑电图（背景节律偏慢，未见明确发放）。', status: '已完成' },
  { id: 15, name: '生长发育评估（复查）', date: '2025-10-28', desc1: '毛健', desc2: '看肌张力情况', result: '肌张力偏高，建议每日康复。', status: '已完成' },
  { id: 14, name: '生长发育评估（看报告）', date: '2025-09-09', desc1: '毛健', desc2: '评估发育', result: '评估表明营养不够，建议转奶蔼儿舒。', status: '已完成' },
  { id: 13, name: '核磁共振', date: '2025-09-04', desc1: '南湖院区 MR室', desc2: '脑白质软化不除外，大枕大池', result: '双侧脑室轻度增宽，双侧脑外间隙轻度增宽，大枕大池，SWI无异常。', status: '已完成' },
  { id: 12, name: '视频脑电图复查', date: '2025-09-03', desc1: '滑翔院区', desc2: '视频脑电共监测3小时', result: '双侧枕区为3-5Hz低慢波，睡眠波正常，身体抖动时EEG未见异常。', status: '已完成' },
  { id: 11, name: '运动评估/神经系统发育评估', date: '2025-09-02', desc1: '巴方', desc2: '测试运动评分', result: '得分12分，百分位P5-10，肌张力高，建议继续康复并做脑电。', status: '已完成' },
  { id: 10, name: '发育评估', date: '2025-07-29', desc1: '毛健', desc2: '新生儿特需门诊', result: '生长落后，肌张力高，有运动障碍风险，需每日康复。', status: '已完成' },
  { id: 9, name: '运动发育评估', date: '2025-07-29', desc1: '巴方', desc2: '三楼 康复门诊', result: 'Timp评分71分（正常偏下），肌张力略偏高，建议康复指导。', status: '已接种' },
  { id: 8, name: '看脖子后面的小包', date: '2025-07-29', desc1: '新生儿外科门诊', desc2: '外科门诊检查', result: '包块良性，继续观察。', status: '已完成' },
  { id: 7, name: '头磁共振', date: '2025-07-26', desc1: '南湖院区 MR室', desc2: '检查白质软化', result: '分析中。', status: '已完成' },
  { id: 6, name: '视频脑电图', date: '2025-06-25', desc1: 'A座一楼2诊室', desc2: '清醒闭目监测3小时', result: '未见明确异常波发放。', status: '已完成' },
  { id: 5, name: '凝血四项', date: '2025-06-25', desc1: '门诊化验室', desc2: '验血复查', result: '纤维蛋白原含量 1.8 FIB（参考2-4）。', status: '已完成' },
  { id: 4, name: '心脏超声', date: '2025-06-18', desc1: '门诊超声室', desc2: '心脏彩色多普勒', result: '动脉导管未见开放，三尖瓣反流，左室整体收缩功能正常。', status: '已完成' },
  { id: 3, name: '眼底复查', date: '2025-06-11', desc1: '盖春柳医生', desc2: '眼底筛查复查', result: '眼底发育良好，眼底毕业。', status: '已完成' },
  { id: 2, name: '血值复查', date: '2025-06-11', desc1: '门诊化验室', desc2: '复查骨代谢与血常规', result: 'D3正常，AD一天一次，铁剂吃到纠正胎龄6个月。', status: '已完成' },
  { id: 1, date: '2025-05-20', name: '出院2周验血', desc1: '出院复查', desc2: '门诊复查肝功能，凝血功能。', result: '验血合格，优思弗停药。', status: '已完成' },
  { id: 0, date: '2025-05-10', name: '足跟血复查', desc1: '多种遗传代谢病异常', desc2: '省妇幼门诊复筛', result: '因做了全显基因筛查，此项已停查。', status: '未完成' }
];

module.exports = {
  defaultVaccinesList,
  defaultHealthcares,
  defaultAssessments,
  defaultClinicalLogs
};
