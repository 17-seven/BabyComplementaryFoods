const mealService = require('../services/meal.service');
const { success } = require('../utils/response');

exports.validate = async (req, res, next) => {
  try {
    const { babyId, days } = req.body;
    if (!babyId || !Array.isArray(days)) {
      return res.status(400).json({ code: 400, message: '参数错误' });
    }
    const report = await mealService.validateWeeklyPlan(babyId, days);
    return res.json(success('食谱校验成功', { validationReport: report }));
  } catch (err) {
    next(err);
  }
};
