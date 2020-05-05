const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

//创建作者模式
const AuthorSchema = new Schema(
{
	first_name: {type: String, required: true, max: 100},
  family_name: {type: String, required: true, max: 100},
  ate_of_birth: {type: Date},
  date_of_death: {type: Date},
});

// 虚拟属性'name'：表示作者全名
AuthorSchema
	.virtual("name")
	.get(function(){
	return this.family_name + "," + this.first_name;
});

// 虚拟属性'lifespan'：作者寿命
AuthorSchema
  .virtual('lifespan')
  .get(function () {
   if(this.date_of_birth != null && this.date_of_death != null)
	 {return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();}
	 return null;
  });

// 虚拟属性'url'：作者 URL
AuthorSchema
  .virtual('url')
  .get(function () {
    return '/catalog/author/' + this._id;
  });

//虚拟属性"date_of_birth_formatted"
AuthorSchema
	.virtual("date_of_birth_formatted")
	.get(function(){
	return this.date_of_birth?moment(this.date_of_birth).format("YYYY-MM-DD"):"";
});

AuthorSchema
	.virtual("date_of_death_formatted")
	.get(function(){
	return this.date_of_death?moment(this.date_of_death).format("YYYY-MM-DD"):"";});

// 先用mongoose.model方法利用模式实例编译出一个模型Author,再将其导出
module.exports = mongoose.model('Author', AuthorSchema);