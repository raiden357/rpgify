import { expect } from 'chai';
import server from './../../server';
import jsonwebtoken from 'jsonwebtoken';
import config from './../../app/config/rpgify';
import User from './../../app/models/schema';

import fs from 'fs';
import mongoose from 'mongoose';

var key = fs.readFileSync(config.key.path);

describe('RPGify Integration Test', () => {

    describe('When a user registers', () => {

        var user = {
            username: 'test',
            password: 'password',
            name: 'name',
            email: 'email@email.com'
        }, statusCode;

        before(done => {
            server.inject({
                url:'/user',
                method:'POST',
                payload: user,
                headers: { 'Content-Type':'application/json' }
            }, response => {
                statusCode = response.statusCode;
                done();
            });
        });

        it("should return a 201 status code", () => {
            expect(statusCode).to.equal(201);
        });

        it('should populate database with a user', (done) => {
            User.findOne({ username: user.username }, (err, foundUser) => {
                expect(foundUser.username).to.equal('test');
                done();
            });
        });

        describe('When a user logs in successfully', () => {

            var login = {
                username: 'test',
                password: 'password'
            }, jwt, token;

            before(done => {
                server.inject({
                    url:'/login',
                    method:'POST',
                    payload: login,
                    headers: { 'Content-Type':'application/json' }
                }, response => {
                    statusCode = response.statusCode;
                    jwt = response.payload;
                    done();
                });
            });


            it("should return a 200 status code", () => {
                expect(statusCode).to.equal(200);
            });

            it("should return a jwt", () => {
                expect(jwt).to.not.be.empty;
            });

            describe("When jwt is decoded", () => {

                before(done => {
                    jsonwebtoken.verify(jwt, key, (err, decoded) => {
                        token = decoded;
                        done();
                    });
                });

                it("should have username inside", () => {
                    expect(token.username).to.equal(login.username);
                });
            });

            describe('When a user is updated successfully', () => {

                var patch = {
                    name: 'newName',
                    email: 'new@gmail.com'
                };

                before(done => {
                    server.inject({
                        url:'/user',
                        method:'PATCH',
                        payload: patch,
                        headers: {
                            'Content-Type':'application/json',
                            'Authorization':'Bearer ' + jwt
                        }
                    }, response => {
                        statusCode = response.statusCode;
                        done();
                    });
                });

                it("should return a 204 status code", () => {
                    expect(statusCode).to.equal(204);
                });

                it("should update user in database", done => {
                    User.find({ userid: token.userid }, (err, foundUser) => {
                        expect(foundUser.name === patch.name);
                        expect(foundUser.email === patch.email);
                        done();
                    });
                });
            });

            describe('When a user attempts invalid patch', () => {

                var patch = {
                    firstname: 'newName'
                };

                before(done => {
                    server.inject({
                        url:'/user',
                        method:'PATCH',
                        payload: patch,
                        headers: {
                            'Content-Type':'application/json',
                            'Authorization':'Bearer ' + jwt
                        }
                    }, response => {
                        statusCode = response.statusCode;
                        done();
                    });
                });

                it("should return a 422 status code", () => {
                    expect(statusCode).to.equal(422);
                });
            });

            describe('When a user is deleted successfully', () => {
                before(done => {
                    server.inject({
                        url:'/user',
                        method:'DELETE',
                        headers: {
                            'Content-Type':'application/json',
                            'Authorization':'Bearer ' + jwt
                        }
                    }, response => {
                        statusCode = response.statusCode;
                        done();
                    });
                });

                it('should return a 204 status code', () => {
                    expect(statusCode).to.equal(204);
                });

                it('should have user deleted from db', (done) => {
                    User.where({ userid: token.userid }).count((err, count) => {
                        expect(count).to.equal(0);
                        done();
                    });
                });
            });
        });
    });
});
