const Author = require('../models/author');
const async = require('async');
const Book = require('../models/book');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// 显示完整的作者列表
exports.author_list = (req, res, next) => {
  Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('author_list', { title: '作者列表', author_list: list_authors });
    });
};

// 为每位作者显示详细信息的页面
exports.author_detail = (req, res, next) => {
  async.parallel({
    author: function(callback) {
        Author.findById(req.params.id)
          .exec(callback)
    },
    author_books: function(callback) {
      Book.find({ 'author': req.params.id },'title summary')
      .exec(callback)
    },
}, function(err, results) {
    if (err) { return next(err); } // Error in API usage.
    if (results.author==null) { // No results.
        let err = new Error('Author not found');
        err.status = 404;
        return next(err);
    }
    // Successful, so render.
    res.render('author_detail', { title: '作者详情', author: results.author, author_books: results.author_books } );
});
};

// 由 GET 显示创建作者的表单
exports.author_create_get = (req, res, next) => {
  res.render('author_form', { title: '创建作者'});
};

// 由 POST 处理作者创建操作
exports.author_create_post = [
  body('first_name').isLength({ min: 1 }).trim().withMessage('名字必须具体说明。'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('姓氏必须具体说明。'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),
  sanitizeBody('first_name').trim().escape(),
  sanitizeBody('family_name').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),
  (req, res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('author_form', { title: '创建作者', author: req.body, errors: errors.array() });
      return;
    }
    else {
      let author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death
      });
      author.save(function (err) {
        if (err) { return next(err); }
        res.redirect(author.url);
      })
  }
}]

// 由 GET 显示删除作者的表单
exports.author_delete_get = (req, res, next) => {
  async.parallel({
    author: (callback) => {
      Author.findById(req.params.id).exec(callback)
    },
    authors_books: (callback) => {
      Book.find({ 'author': req.params.id }).exec(callback)
    },
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.author==null) {
        res.redirect('/catalog/authors');
    }
    res.render('author_delete', { title: '删除作者', author: results.author, author_books: results.authors_books } );
  });
};

// 由 POST 处理作者删除操作
exports.author_delete_post = (req, res, next) => {
  async.parallel({
    author: function(callback) {
      Author.findById(req.body.authorid).exec(callback)
    },
    authors_books: function(callback) {
      Book.find({ 'author': req.body.authorid }).exec(callback)
    },
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.authors_books.length > 0) {
      res.render('author_delete', { title: '删除作者', author: results.author, author_books: results.authors_books } );
      return;
    }
    else {
      Author.findByIdAndRemove(req.body.authorid, err => {
        if (err) { return next(err); }
        res.redirect('/catalog/authors')
      })
    }
  });
};

// 由 GET 显示更新作者的表单
exports.author_update_get = (req, res, next) => {
  Author.findById(req.params.id).exec((err, author)=>{
    if(err){ return next(err); }
    if(author==null){
      let err= new Error("作者没找到");
      err.status=404;
      return next(err);
    }
    res.render('author_form',{title:'更新作者', author:author});
  });
};

// 由 POST 处理作者更新操作
exports.author_update_post = [
  body('first_name').isLength({ min: 1 }).trim().withMessage('名字必须具体说明。'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('姓氏必须具体说明。'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),
  sanitizeBody('first_name').trim().escape(),
  sanitizeBody('family_name').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),
  (req, res, next) => {
    let errors = validationResult(req);
    let author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id:req.params.id
    });
    if (!errors.isEmpty()) {
      res.render('author_form', { title: '更新作者', author: author, errors: errors.array() });
      return;
    }
    else {
      Author.findByIdAndUpdate(req.params.id,author,{},function (err,theauthor) {
        if (err) { return next(err); }
        res.redirect(theauthor.url);
      })
    }
  }
]