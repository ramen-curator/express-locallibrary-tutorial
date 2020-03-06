const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// 显示完整的藏书种类列表
exports.genre_list = (req, res, next) => {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genre) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('genre_list', { title: '藏书类型列表', genre_list: list_genre });
    });
};

// 为每一类藏书显示详细信息的页面
exports.genre_detail = (req, res, next) => {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id)
          .exec(callback);
      },

      genre_books: function(callback) {
        Book.find({ 'genre': req.params.id })
          .exec(callback);
      },
    } , 
    (err, results) => 
    {
      if (err) { return next(err); }
      if (results.genre==null) { // No results.
        let err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } )
    });
};

// 由 GET 显示创建藏书种类的表单
exports.genre_create_get = (req, res, next) => {
  res.render('genre_form', { title: '创建藏书类型' });
};

// 由 POST 处理藏书种类创建操作
exports.genre_create_post = [
  body('name', 'Genre name required').isLength({ min: 1 }).trim(),
  sanitizeBody('name').trim().escape(),
  (req, res, next) => {
    let errors = validationResult(req);
    let genre = new Genre(
      { name: req.body.name }
    );
    if (!errors.isEmpty()) {
      res.render('genre_form', { title: '创建藏书类型', genre: genre, errors: errors.array()});
      return;
    }
    else{
      Genre.findOne({ 'name': req.body.name })
        .exec(function(err, found_genre) {
          if (err) { return next(err); }
          if (found_genre) {
            res.redirect(found_genre.url);
          }
          else {
            genre.save(function (err) {
              if (err) { return next(err); }
              res.redirect(genre.url);
            });
          }
        });
      }
    }
]

// 由 GET 显示删除藏书种类的表单
exports.genre_delete_get = (req, res, next) => {
  async.parallel({
    //同步载入，这个类型、所有 是这个类型的 书
    //req.params.id的原因是，这个路由是/genre/:id/delete，里面可以取 id 参数
    genre: (callback) => { Genre.findById(req.params.id).exec(callback) },
    genre_books: (callback) => { Book.find({'genre':req.params.id}).exec(callback)}
  },
  (err,results)=>{
    if(err){return next(err);}//有错就报错
    if(results.genre==null){res.redirect('/catalog/genres');}//这个类型没找到就重定向回去类型列表
    res.render('genre_delete',{ title:'删除藏书类型', genre: results.genre, genre_books: results.genre_books });
      //把找到的 这个类型实例、所有 是这个类型的书 的实例，还有标题，丢进genre_delete模版
  });
};

// 由 POST 处理藏书种类删除操作
exports.genre_delete_post = (req, res, next) => {
  async.parallel({ 
    //依旧载入，这个类型、所有 是这个类型的 书
    //不同的是，post传上来的是genreid,并且是放在http请求的请求体中，此处称为req.body（req的body）
    genre: (callback) => {Genre.findById(req.body.genreid).exec(callback)},
    genre_books: (callback) => {Book.find({'genre': req.body.genreid}).exec(callback)}
  },
  (err,results)=>{  //日他的方向键，还是用vim实在，不然手移键盘的幅度真是大。日。
    if(err){return next(err);}
    if(results.genre_books.length > 0){
      res.render('genre_delete',{ title:'删除藏书类型', genre: results.genre, genre_books: results.genre_books });
      return;
    }
    else{
      Genre.findByIdAndRemove(req.body.genreid, err =>{
        if(err){return next(err);}
        res.redirect('/catalog/genres')
      })
    }
  })
};

// 由 GET 显示更新藏书种类的表单
exports.genre_update_get = (req, res, next) => {
  Genre.findById(req.params.id).exec((err, genre)=>{
    if(err){ return next(err); }
    if(genre==null){
      let err= new Error("作者没找到");
      err.status=404;
      return next(err);
    }
    res.render('genre_form',{title:'更新藏书类型', genre:genre});
  });
};

// 由 POST 处理藏书种类更新操作
exports.genre_update_post = [
  body('name', '藏书类型名不该未空').isLength({ min: 1 }).trim(),
  sanitizeBody('name').trim().escape(),
  (req, res, next) => {
    let errors = validationResult(req);
    let genre = new Genre(
      { 
        name: req.body.name,
        _id: req.params.id
      }
    );
    if (!errors.isEmpty()) {
      res.render('genre_form', { title: '创建藏书类型', genre: genre, errors: errors.array()});
      return;
    }
    else{
      Genre.findByIdAndUpdate(req.params.id,genre,{},function (err,thegenre) {
        if (err) { return next(err); }
        res.redirect(thegenre.url);
      });
    }
  }

]