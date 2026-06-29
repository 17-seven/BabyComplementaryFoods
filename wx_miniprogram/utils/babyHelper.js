// utils/babyHelper.js

/**
 * 计算实际与纠正月龄
 * @param {string} birthDateStr 生日 (格式 "2025-02-18")
 * @param {number} prematureDays 早产天数 (王玧初为 71 天)
 */
function calculateBabyAge(birthDateStr, prematureDays) {
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  // 计算实际相差总天数
  const diffTime = now.getTime() - birth.getTime();
  const actualTotalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 实际月龄计算
  const actualAge = getAgeDetailString(actualTotalDays);
  
  // 纠正月龄计算 (实际天数减去早产天数)
  const correctedTotalDays = actualTotalDays - prematureDays;
  let correctedAge = "已足月";
  if (correctedTotalDays > 0) {
    correctedAge = getAgeDetailString(correctedTotalDays);
  } else {
    correctedAge = "未到纠正预产期";
  }
  
  return {
    actualAge,
    correctedAge,
    actualTotalDays
  };
}

function getAgeDetailString(totalDays) {
  const months = Math.floor(totalDays / 30.45);
  const remainingDays = Math.floor(totalDays % 30.45);
  return `${months}月${remainingDays}天`;
}

/**
 * 依据起跑日期与需补种列表，以15天为步长自动计算后续排程
 */
function regenerateVaccineSchedule(vaccineList, catchUpStartDate) {
  const due = vaccineList.filter(v => v.status === '需补种' || v.status === '推荐接种');
  const base = new Date(catchUpStartDate);
  
  return due.map((v, i) => {
    const plannedDate = new Date(base);
    plannedDate.setDate(plannedDate.getDate() + i * 15);
    const plannedStr = plannedDate.toISOString().slice(0, 10);
    const curr = new Date();
    
    // 清除时分秒只算天数差
    const d1 = new Date(plannedStr);
    const d2 = new Date(curr.toISOString().slice(0, 10));
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      name: v.name,
      dose: v.dose,
      status: v.status,
      plannedDate: plannedStr,
      daysLeft: diffDays > 0 ? diffDays : 0
    };
  });
}

module.exports = {
  calculateBabyAge,
  regenerateVaccineSchedule
};
