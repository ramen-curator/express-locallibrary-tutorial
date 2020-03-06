let BookInstance = require('../models/bookinstance');
let Book = require('../models/book');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const async = require('async');

// 显示完整的藏书副本列表
exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
  .populate('book')
  .exec(function (err, list_bookinstances) {
    if (err) { return next(err); }
    // Successful, so render
    res.render('bookinstance_list', { title: '藏书副本列表', bookinstance_list: list_bookinstances });
  });
};

// 为藏书的每一本副本显示详细信息的页面
exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          const err = new Error('找不到该书');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail', { title: '藏书：', bookinstance:  bookinstance});
    })
};

// 由 GET 显示创建藏书副本的表单
exports.bookinstance_create_get = (req, res, next) => {
  Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: '创建藏书副本', book_list:books});
    });
};

// 由 POST 处理藏书副本创建操作
exports.bookinstance_create_post = [

  body('book', '书本必须具体说明').isLength({ min: 1 }).trim(),
  body('imprint', '出版社必须具体说明').isLength({ min: 1 }).trim(),
  body('due_back', '日期无效').optional({ checkFalsy: true }).isISO8601(),
  
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),
  
  (req, res, next) => {

    const errors = validationResult(req);

    let bookinstance = new BookInstance(
      { book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back
      });

    if (!errors.isEmpty()) {
      Book.find({},'title')
        .exec(function (err, books) {
          if (err) { return next(err); }
          res.render('bookinstance_form', 
            { 
              title: '创建藏书实例', 
              book_list : books, 
              selected_book : bookinstance.book._id, 
              errors: errors.array(),
              bookinstance:bookinstance 
            });
        });
        return;
      }
    else {
      bookinstance.save(function (err) {
        if (err) { return next(err); }
        res.redirect(bookinstance.url);
      });
    }
  }
]

// 由 GET 显示删除藏书副本的表单
exports.bookinstance_delete_get = (req, res, next) => {
    //同步载入，这个书的副本、所有 是这个书的 书副本
  BookInstance.findById(req.params.id).populate('book')
    .exec((err,bookinstance)=>{
      if(err){return next(err);}//有错就报错
      if(bookinstance==null){res.redirect('/catalog/bookinstances');}//这个类型没找到就重定向回去列表
      res.render('bookinstance_delete',{ title:'删除藏书副本', bookinstance: bookinstance });
      //把找到的 这个副本实例、标题，丢进模版
    })
};

// 由 POST 处理藏书副本删除操作
exports.bookinstance_delete_post = (req, res, next) => {
  BookInstance.findByIdAndRemove(req.body.bookinstanceid,err =>{
    if(err){return next(err);}
    res.redirect('/catalog/bookinstances')
    });
};

// 由 GET 显示更新藏书副本的表单
exports.bookinstance_update_get = (req, res, next) => {
  async.parallel(
    {
      bookinstance: (callback)=>{
        BookInstance.findById(req.params.id).populate('book').exec(callback);
      },
      books:(callback)=>{
        Book.find({},'title').exec(callback)
      }
    },(err,results)=>{
      if(err){return next(err)};
      if(results.bookinstance==null){
        let err = new Error('藏书副本未找到');
        err.status=404;
        return next(err);
      }
      res.render('bookinstance_form',{title:'更新藏书副本', bookinstance: results.bookinstance,book_list: results.books})
    }
  )
};

// 由 POST 处理藏书副本更新操作
exports.bookinstance_update_post = [

  body('book', '书本必须具体说明').isLength({ min: 1 }).trim(),
  body('imprint', '出版社必须具体说明').isLength({ min: 1 }).trim(),
  body('due_back', '日期无效').optional({ checkFalsy: true }).isISO8601(),
  
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),
  (req, res, next) => {

    const errors = validationResult(req);

    let bookinstance = new BookInstance(
      { book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id
      });

    if (!errors.isEmpty()) {
      Book.find({},'title')
        .exec(function (err, books) {
          if (err) { return next(err); }
          res.render('bookinstance_form', 
            { 
              title: '创建藏书实例', 
              book_list : books, 
              selected_book : bookinstance.book._id, 
              errors: errors.array(),
              bookinstance:bookinstance 
            });
        });
        return;
    }else {
      bookinstance.save(function (err) {
        if (err) { return next(err); }
        res.redirect(bookinstance.url);
      });
      BookInstance.findByIdAndUpdate(req.params.id,bookinstance,{},(err,thebookinstance)=>{
        if(err){return next(err);}
        res.redirect(thebookinstance.url)
      })
    }
  } 
]