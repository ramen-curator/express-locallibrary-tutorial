const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//类型 的模板，字段有：名字、类型详情的url（虚拟属性）
const GenreSchema = new Schema({
    name:{type:String,require:true,min:3,max:100}
  }
);

// 虚拟属性'url'：类型详情 
GenreSchema
  .virtual('url')
  .get(function () {
    return '/catalog/genre/' + this._id;
  });

// 导出 BookInstancec 模型
module.exports = mongoose.model('Genre', GenreSchema);