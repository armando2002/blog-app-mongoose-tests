const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);


// generate blog post
function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(),
        content: faker.lorem.text()        
    };
}

// seed DB with blog posts
function seedBlogPostData() {
    console.info('seeding blogpost data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

// tear down DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogposts API resource', function() {
    // before the first function, run server
    before(function() {
        console.log(TEST_DATABASE_URL);
        return runServer(TEST_DATABASE_URL);
    });
    // before each function, seed blog post data
    beforeEach(function() {
        return seedBlogPostData();
    });
    // after each function, tear down the DB
    afterEach(function() {
        return tearDownDb();
    });
    // after the last function, close the server
    after(function() {
        return closeServer();
    });


    // GET test
    describe('GET Endpoint', function() {

        it('should return all existing blog posts', function() {
            // 1. get back all blog posts returned by GET request
            // 2. prove res has right status, data type
            // 3. prove # of blog posts in res = # in DB
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body).to.have.lengthOf(count);
                });
        });
        
        it('shoud return blog posts with the right fields', function() {
            // get back all blog posts and ensure they have the expected keys

            let resBlogPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);

                res.body.forEach(function(blogpost) {
                    expect(blogpost).to.be.a('object');
                    expect(blogpost).to.include.keys(
                        'author', 'title', 'content', 'created');
                });
                resBlogPost = res.body[0];
                return BlogPost.findById(resBlogPost.id);
                })
                .then(function(blogpost) {

                    expect(resBlogPost.id).to.be.equal(blogpost.id);
                    expect(resBlogPost.author).to.be.equal(blogpost.authorName);
                    expect(resBlogPost.title).to.be.equal(blogpost.title);
                    expect(resBlogPost.content).to.be.equal(blogpost.content);
                });
            });
        });

        // POST
        describe('POST Endpoint', function() {
            // 1. make a post request with data
            // 2. prove post has right keys and ID is there

            it('should add a new blog post', function() {

                const newBlogPost = generateBlogPostData();
                let res;

                return chai.request(app)
                    .post('/posts')
                    .send(newBlogPost)
                    .then(function(res) {
                        expect(res).to.have.status(201);
                        expect(res).to.be.json;
                        expect(res.body).to.be.a('object');
                        expect(res.body).to.include.keys(
                            'id', 'author', 'title', 'content', 'created');
                        expect(res.body.id).to.not.be.null;
                        expect(res.body.author).to.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
                        expect(res.body.title).to.equal(newBlogPost.title);
                        expect(res.body.content).to.equal(newBlogPost.content);
                        return BlogPost.findById(res.body.id);
                    })
                    .then(function(blogpost) {
                        expect(blogpost.author.firstName).to.equal(newBlogPost.author.firstName);
                        expect(blogpost.author.lastName).to.equal(newBlogPost.author.lastName);
                        expect(blogpost.title).to.equal(newBlogPost.title);
                        expect(blogpost.content).to.equal(newBlogPost.content);
                    });
                    
                });
            });
        // PUT
        describe('PUT Endpoint', function() {
            // 1. get an existing blog post from DB
            // 2. make a PUT request to update that blog post
            // 3. prove blog post returned by request contains updated data
            // 4. provie blog post in DB is correctly updated
            it('should update fields you send over', function() {
                const updateData = {
                    title: 'fooTitle',
                    content: 'barContent'
                };

                return BlogPost
                    .findOne()
                    .then(function(blogpost) {
                        updateData.id = blogpost.id;

                        return chai.request(app)
                            .put(`/posts/${blogpost.id}`)
                            .send(updateData);
                    })
                    .then(function(res) {
                        expect(res).to.have.status(204);

                        return BlogPost.findById(updateData.id);
                    })
                    .then(function(blogpost) {
                        expect(blogpost.title).to.equal(updateData.title);
                        expect(blogpost.content).to.equal(updateData.content);
                    });
        });
    });
        // DELETE
        describe('DELETE Endpoint', function() {
            // 1. get a post
            // 2. make a DELETE request for the post ID
            // 3. assert correct status code
            // 4. prove that post with ID doesn't exist in DB
            it('delete a blog post by ID', function() {
                let blogpost;

                return BlogPost
                    .findOne()
                    .then(function(_blogpost) {
                        blogpost = _blogpost;
                        return chai.request(app).delete(`/posts/${blogpost.id}`);
                    })
                    .then(function(res) {
                        expect(res).to.have.status(204);
                        return BlogPost.findById(blogpost.id);
                    })
                    .then(function(_blogpost) {
                        expect(_blogpost).to.be.null;
                    });
            });
        });

    });