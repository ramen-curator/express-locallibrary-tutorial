const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const async = require('async');

exports.index = (req, res, next) => { 
  async.parallel({
    book_count: function(callback) {
        Book.count({}, callback); // Pass an empty object as match condition to find all documents of this collection
    },
    book_instance_count: function(callback) {
        BookInstance.count({}, callback);
    },
    book_instance_available_count: function(callback) {
        BookInstance.count({status:'可供借阅'}, callback);
    },
    author_count: function(callback) {
        Author.count({}, callback);
    },
    genre_count: function(callback) {
        Genre.count({}, callback);
    },
}, function(err, results) {
    res.render('index', { title: '本地图书馆首页', error: err, data: results });
});
};

// 显示完整的藏书列表
exports.book_list = (req, res, next) => {
  Book.find({}, 'title author')
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('book_list', { title: '藏书列表', book_list: list_books });
    });
};

// 为每种藏书显示详细信息的页面
exports.book_detail = (req, res, next) => {
  async.parallel({
    book: function(callback) {
        //用这个书本id，把书本实例找出来，并且解析其中的author和genre
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
    },//无误
    book_instance: function(callback) {

      BookInstance.find({ 'book': req.params.id })
      .exec(callback);
    },//找出相应的书本副本的实例。无误
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.book==null) { // No results.
        let err = new Error('没有找到这本书');
        err.status = 404;
        return next(err);
    }
    // Successful, so render.
    res.render('book_detail', { title: '标题', book: results.book, book_instances: results.book_instance } );
    //把找到的书实例、找到的 书副本 实例，回传给那个模板，用book和book_instances参数
});
};//无误

// 由 GET 显示创建藏书的表单
exports.book_create_get = (req, res, next) => {
  async.parallel({
    authors: function(callback) {
        Author.find(callback);//找到全部的作者
    },
    genres: function(callback) {
        Genre.find(callback);//找到全部的类型
    },
  }, function(err, results) {
    if (err) { return next(err); }
    res.render('book_form', { title: '创建藏书', authors: results.authors, genres: results.genres });
    //把全部作者、全部类型，作为参数authors、genres传递给book_form模板
  });
};

// 由 POST 处理藏书创建操作
exports.book_create_post = [
  (req, res, next) => {
    if(!(req.body.genre instanceof Array)){
      if(typeof req.body.genre==='undefined')
      req.body.genre=[];
      else
      req.body.genre=new Array(req.body.genre);
    }
    next(); 
  },
  body('title', '标题必须不为空。').isLength({ min: 1 }).trim(),
  body('author', '作者必须不为空').isLength({ min: 1 }).trim(),
  body('summary', '摘要必须不为空').isLength({ min: 1 }).trim(),
  body('isbn', '书号必须不为空').isLength({ min: 1 }).trim(),
  sanitizeBody('title').trim().escape(),
  sanitizeBody('author').trim().escape(),
  sanitizeBody('summary').escape(),
  sanitizeBody('isbn').escape(),
  sanitizeBody('genre.*').escape(),//该不会是他妈在这里被转义了吧！
  (req, res, next) => {
    const errors = validationResult(req);
    let book = new Book(
      { 
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre
      }
    );
    if (!errors.isEmpty()) {
      async.parallel({
          authors: function(callback) {
            Author.find(callback);
          },
          genres: function(callback) {
            Genre.find(callback);
          },
      }, 
      function(err, results) {
        if (err) { return next(err); }

        // Mark our selected genres as checked.
        for (let i = 0; i < results.genres.length; i++) {
          if (book.genre.indexOf(results.genres[i]._id) > -1) {
            results.genres[i].checked='true';
          }
        }
        res.render('book_form', { title: '创建图书',authors:results.authors, genres:results.genres, book: book, errors: errors.array() });
      });
      return;
    }
    else {
      // Data from form is valid. Save book.
      book.save(function (err) {
        if (err) { return next(err); }
        //successful - redirect to new book record.
        res.redirect(book.url);
      });
    }
  }
]

// 由 GET 显示删除藏书的表单
exports.book_delete_get = (req, res, next) => {
  async.parallel({
    //同步载入，这个书、所有 是这个书的 书副本
    book: (callback) => { Book.findById(req.params.id).populate('author').populate('genre').exec(callback) },
    book_bookinstances: (callback) => { BookInstance.find({'book':req.params.id}).populate('book').exec(callback)}
  },
  (err,results)=>{
    if(err){return next(err);}//有错就报错
    if(results.book==null){res.redirect('/catalog/books');}//这个类型没找到就重定向回去类型列表
    res.render('book_delete',{ title:'删除藏书', book: results.book, book_bookinstances: results.book_bookinstances });
      //把找到的 这个类型实例、所有 是这个类型的书 的实例，还有标题，丢进genre_delete模版
  });
};

// 由 POST 处理藏书删除操作
exports.book_delete_post = (req, res, next) => {
  async.parallel({
    //同步载入，这个书、所有 是这个书的 书副本
    book: (callback) => { Book.findById(req.body.bookid).populate('author').populate('genre').exec(callback) },
    book_bookinstances: (callback) => { BookInstance.find({'book':req.body.bookid}).populate('book').exec(callback)}
  },
  (err,results)=>{
    if(err){return next(err);}//有错就报错
    if(results.book_bookinstances > 0 ){
      res.render('book_delete',{ title:'删除藏书', book: results.book, book_bookinstances: results.book_bookinstances });
      return;
      //把找到的 这个类型实例、所有 是这个类型的书 的实例，还有标题，丢进genre_delete模版
    }
    else{
      Book.findByIdAndRemove(req.body.bookid,err =>{
        if(err){return next(err);}
        res.redirect('/catalog/books');
      })
    }
  });
};


// 由 GET 显示更新藏书的表单
exports.book_update_get = (req, res, next) => {

  async.parallel(
    {
      book: (callback) =>{
        Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
      },
      authors: function(callback) {
        Author.find(callback);
      },
      genres: function(callback) {
        Genre.find(callback);
      },
    }, (err, results)=> {
        if (err) { return next(err); }
        if (results.book==null) { // No results.
            let err = new Error('没找到该书');
            err.status = 404;
            return next(err);
        }
        // Success.
        // Mark our selected genres as checked.
        for (let all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
            for (let book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
                    results.genres[all_g_iter].checked='true';
                }
            }
        }
        res.render('book_form', { title: '更新藏书', authors:results.authors, genres:results.genres, book: results.book });
    }
  );
};

// 由 POST 处理藏书更新操作
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if(!(req.body.genre instanceof Array)){
      if(typeof req.body.genre==='undefined')
      req.body.genre=[];
      else
      req.body.genre=new Array(req.body.genre);
    }
    next();
  },
   
  // Validate fields.
  body('title', '标题不该为空').isLength({ min: 1 }).trim(),
  body('author', '作者不该为空').isLength({ min: 1 }).trim(),
  body('summary', '摘要不该为空').isLength({ min: 1 }).trim(),
  body('isbn', '书号不该为空').isLength({ min: 1 }).trim(),

  // Sanitize fields.
  sanitizeBody('title').trim().escape(),
  sanitizeBody('author').trim().escape(),
  sanitizeBody('summary').trim().escape(),
  sanitizeBody('isbn').trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    let book = new Book(
      { 
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
        _id:req.params.id //This is required, or a new ID will be assigned!
      }
    );

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel(
        {
          authors: function(callback) {
            Author.find(callback);
          },
          genres: function(callback) {
            Genre.find(callback);
          },
        }, function(err, results) {
          if (err) { return next(err); }

          // Mark our selected genres as checked.
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked='true';
            }
          }
          res.render('book_form', { title: 'Update Book',authors:results.authors, genres:results.genres, book: book, errors: errors.array() });
        }
      );
      return;
    }else {
      // Data from form is valid. Update the record.
      Book.findByIdAndUpdate(req.params.id, book, {}, function (err,thebook) {
        if (err) { return next(err); }
        // Successful - redirect to book detail page.
        res.redirect(thebook.url);
      });
    }
  }
]