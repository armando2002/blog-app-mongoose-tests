const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('..server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// seed DB with blog posts
function seedBlogPostData() {
    console.info('seeding blogpost data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogPostData());
    }

    return BlogPost.insertMany(seedData);
}

// generate blog post
function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.name.title(),
        content: faker.lorem.paragraph(),
        created: faker.date.past()
    }
}

// tear down DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogposts API resource', function() {
    // before the first function, run server
    before(function() {
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
    describe('GET endpoint', function() {

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
                    expect(res.body.BlogPost).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body.BlogPost).to.have.lengthOf(count);
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
                expect(res.body.BlogPost).to.be.a('array');
                expect(res.body.BlogPost).to.have.lengthOf.at.least(1);

                res.body.BlogPosts.forEach(function(blogpost) {
                    expect(blogpost).to.be.a('object');
                    expect(blogpost).to.include.keys(
                        'author', 'title', 'content', 'created');
                });
                resBlogPost = res.body.BlogPosts[0];
                return Restaurant.findById(resBlogPost.id);
                })
                .then(function(blogpost) {

                    expect(resBlogPost.id).to.be.equal(blogpost.id);
                    expect(resBlogPost.author).to.be.equal(blogpost.author);
                    expect(resBlogPost.title).to.be.equal(blogpost.title);
                    expect(resBlogPost.content).to.be.equal(blogpost.content);
                    expect(resBlogPost.created).to.be.equal(blogpost.created);
                });
            });
        });

        // POST

        // PUT

        // DELETE
    });