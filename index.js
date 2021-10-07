#!/usr/bin/env node
'use strict';

// Ensure we can run against the HTTPS endpoint
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const {to} = require('await-to-js');
const {Parser} = require('json2csv');
const fs = require('fs');
const query = require('./caching/api-query');
const csv = require('csvtojson');
const path = require('path');

const FILE_NAME = 'Barbados Cities.csv'; // change here to retrieve a new country's set of data

(async () => {

    // Get all the cities from the CSV file
    const cities = await csv()
        .fromFile(path.join(
            __dirname,
            `./cities/${FILE_NAME}`
            )
        );

    let countries = [{
        code: cities[0].country_code,
        cities: cities.map(city => city.city)
    }];
    let err, results;
    for (let country of countries) { // loop through each country
        console.info(`Starting on ${country.code}`);
        for (let city of country.cities) { // loop through each city (query lookup)
            console.info(`Starting on ${country.code} - ${city}`);
            let overallResults = [];
            let page = 1; // start at page 1
            let count = 0;
            let totalCount = 0;
            do {

                // Retrieve the data based on the query parameters
                const qs = {
                    country: country.code,
                    page,
                    q: city
                };
                [err, results] = await to(query(
                    `https://location.westernunion.com/api/locations`,
                    qs,
                    60 * 60
                ));
                if (err) { // break out of the script if any error is thrown
                    console.error(err);
                    process.exit();
                }
                totalCount = +results.resultCount; // store the total count of results
                overallResults = overallResults.concat(results.results); // store the overall results
                page += 1; // increment the page number
                count += results.results.length; // increment the count of results retrieved so far
            } while (count < totalCount);

            // Print out the results for the specified country/city combination
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(overallResults.map(({
                                                                     name,
                                                                     orig_id,
                                                                     streetAddress,
                                                                     state,
                                                                     location,
                                                                     platinum,
                                                                     COUNTRY_NAME
                                                                 }) => ({
                name,
                orig_id,
                streetAddress,
                state,
                location,
                platinum,
                COUNTRY_NAME
            })));
            fs.writeFileSync(`./data/wu-locations-for-${country.code}-${city}.csv`, csv);
            console.info(`Finishing ${country.code} - ${city}`);
        }
        console.info(`Finishing ${country.code}`);
    }
    console.info(`All done!`);
    process.exit();
})()
