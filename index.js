const PORT = process.env.PORT | 3000

import express from 'express'
import axios from 'axios'
import cheerio from 'cheerio'

import {driversURLs as driversSource} from './driversURLs.js'
import {constructorsURLs as constructorsSource} from './constructorsURLs.js'

const app = express()

function getMonthFromString(mon){
    var d = Date.parse(mon + "1, 2012");
    if(!isNaN(d)){
        return new Date(d).getMonth() + 1;
    }
    return -1;
}

// retrieve drivers' URLs
const driversURLs = []
axios.get('https://www.racing-statistics.com/en/drivers').then(response => {
    const html = response.data
    const $ = cheerio.load(html)
    $(("div.letterboxes>div.letterbox>table>tbody>tr>td>a"),html).each(function () {
        const driverURL = $(this).attr('href')
        driversURLs.push(driverURL)
    })
})

// retrieve constructors' URLs
const constructorsURLs = []
axios.get('https://www.racing-statistics.com/en/constructors').then(response => {
    const html = response.data
    const $ = cheerio.load(html)
    $(("div.letterboxes>div.letterbox>table>tbody>tr>td>a"),html).each(function(){
        const constructorURL = $(this).attr('href')
        constructorsURLs.push(constructorURL)
    })
})

// retrieve drivers' stats
const drivers = []
driversSource.forEach(URL => {
    let key
    const drivers_keys1 = [], drivers_values1 = []
    const drivers_keys2 = [], drivers_values2 = []
    let driver = {}
    axios.get(URL).then(response => {
        const html = response.data
        const $ = cheerio.load(html)

        // name
        $(("h1[itemprop='name']"),html).each(function () {
            driver.name = $(this).text().trim()
            key = $(this).text().trim().replace(/\s/, '-').toLowerCase()
        })

        // bio
        $(("div.blocks.blocks2:first-of-type>fieldset.block:nth-child(1)>table:first-of-type>tbody>tr"),html).each(function () {
            drivers_keys1.push($(this).find('td:nth-child(1)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(':','').replace(/ +/g,'_').trim())
            drivers_values1.push($(this).find('td:nth-child(2)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(/  +/g,' ').trim())
        })

        const bio = drivers_values1.reduce(function (obj, field, index) {
            obj[drivers_keys1[index]] = field;
            return obj;
        }, {})

        if(bio.date_of_birth) {
            bio.date_of_birth_day = parseInt(bio.date_of_birth.split(' ')[0].toString())
            bio.date_of_birth_month = parseInt(getMonthFromString(bio.date_of_birth.split(' ')[1].toString()))
            bio.date_of_birth_year = parseInt(bio.date_of_birth.split(' ')[2].toString())
            if(bio.date_of_birth.split(' ')[3]) bio.age = parseInt(bio.date_of_birth.split(' ')[3].toString().replace('(','').replace(')',''))
            delete bio.date_of_birth
        }

        if(bio.date_of_death) {
            bio.date_of_death_day = parseInt(bio.date_of_death.split(' ')[0].toString())
            bio.date_of_death_month = parseInt(getMonthFromString(bio.date_of_death.split(' ')[1].toString()))
            bio.date_of_death_year = parseInt(bio.date_of_death.split(' ')[2].toString())
            if(bio.date_of_death.split(' ')[3]) bio.age_at_death = parseInt(bio.date_of_death.split(' ')[3].toString().replace('(','').replace(')',''))
            bio.status = 'deceased'
            delete bio.date_of_death
        }
        else{
            bio.status = 'alive'
        }

        // stats
        $(("div.blocks.blocks2:first-of-type>fieldset.block:nth-child(2)>table>tbody>tr"),html).each(function () {
            drivers_keys2.push($(this).find('td:nth-child(1)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(':','').replace(/ +/g,'_').trim())
            drivers_values2.push($(this).find('td:nth-child(2)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(/  +/g,' ').trim())
        })

        const stats = drivers_values2.reduce(function (obj, field, index) {
            obj[drivers_keys2[index]] = field;
            return obj;
        }, {})
        
        if(stats.wins) stats.wins = parseInt(stats.wins.split(' ')[0].toString())
        if(stats.podiums) stats.podiums = parseInt(stats.podiums.split(' ')[0].toString())
        if(stats.pole_positions) stats.pole_positions = parseInt(stats.pole_positions.split(' ')[0].toString())
        if(stats.championships) stats.championships = parseInt(stats.championships.split(' ')[0].toString())
        if(stats.best_result) stats.best_result = parseInt(stats.best_result.split(' ')[0].toString())
        if(stats.best_grid_position) stats.best_grid_position = parseInt(stats.best_grid_position.split(' ')[0].toString())
        if(stats.seasons) stats.seasons = parseInt(stats.seasons)
        if(stats.events) stats.events = parseInt(stats.events)
        if(stats.starts) stats.starts = parseInt(stats.starts)
        if(stats.points) stats.points = parseInt(stats.points.split(' ')[0].toString())
        if(stats.laps_raced) stats.laps_raced = parseInt(stats.laps_raced)
        if(stats.laps_led) stats.laps_led = parseInt(stats.laps_led.split(' ')[0].toString())
        if(stats.fastest_laps) stats.fastest_laps = parseInt(stats.fastest_laps.split(' ')[0].toString())
        if(stats.retirements) stats.retirements = parseInt(stats.retirements.split(' ')[0].toString())

        driver.bio = bio
        driver.stats = stats

        drivers.push(driver)
    })
})

// retrieve constructors' stats
const constructors = []
constructorsSource.forEach(URL => {
    const constructors_keys = [], constructors_values = []
    let constructor = {}, stats = {}
    axios.get(URL)
    .then(response => {
        const html = response.data
        const $ = cheerio.load(html)
        let tds = [], drivers = []
        const name = $((".container>.layout>h1"),html).text().trim()
        const nationality = $(("div.blocks.blocks2:first-of-type>fieldset.block:nth-child(1)>table:nth-of-type(1)>tbody>tr>td:nth-child(2)>a"),html).text().trim()
        $(("div.blocks.blocks2:first-of-type>fieldset.block:nth-child(1)>table:nth-of-type(2)>tbody>tr>td:nth-child(2)>table>tbody>tr"),html).each(function () {
            drivers.push($(this).find('td:nth-child(2)>a').text().trim())
        })
        $(("div.blocks.blocks2:first-of-type>fieldset.block:nth-child(2)>table>tbody>tr"),html).each(function () {
            constructors_keys.push($(this).find('td:nth-child(1)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(':','').replace(/ +/g,'_').trim())
            constructors_values.push($(this).find('td:nth-child(2)').text().trim().replace(/(\r\n|\n|\r)/gm, '').replace(/  +/g,' ').trim())
        })

        const stats = constructors_values.reduce(function (obj, field, index) {
            obj[constructors_keys[index]] = field;
            return obj;
        }, {})

        if(stats.wins) stats.wins = parseInt(stats.wins.split(' ')[0].toString())
        if(stats.pole_positions) stats.pole_positions = parseInt(stats.pole_positions.split(' ')[0].toString())
        if(stats.best_result) stats.best_result = parseInt(stats.best_result.split(' ')[0].toString())
        if(stats.seasons) stats.seasons = parseInt(stats.seasons.split(' ')[0].toString())
        if(stats.events) stats.events = parseInt(stats.events.split(' ')[0].toString())
        if(stats.driver_championships) stats.driver_championships = parseInt(stats.driver_championships.split(' ')[0].toString())
        if(stats.constructor_championships) stats.constructor_championships = parseInt(stats.constructor_championships.split(' ')[0].toString())
        if(stats.points) stats.points = parseInt(stats.points.split(' ')[0].toString())

        // stats.wins = wins
        // stats.pps = pps
        // stats.br = br
        // stats.seasons = seasons
        // stats.entries = entries
        // stats.wdc = WDC
        // stats.wcc = WCC
        // stats.pts = pts
        
        constructor.name = name
        constructor.nationality = nationality,
        drivers.length? constructor.driver_lineup = drivers.sort() : constructor.driver_lineup = 'N/A'
        constructor.stats = stats
        constructors.push(constructor)
    })
})

/* ---------------------------------------- ENDPOINTS ---------------------------------------- */
app.get('/URLs/drivers', (req, res) => {
    console.log(driversURLs.length)
    res.json(driversURLs)
})

app.get('/URLs/constructors', (req, res) => {
    console.log(constructorsURLs.length)
    res.json(constructorsURLs)
})

app.get('/drivers', (req, res) => {
    console.log(drivers.length)
    res.json(drivers)
})

app.get('/constructors', (req, res) => {
    console.log(constructors.length)
    res.json(constructors)
})

app.listen(PORT, () => console.log(`Server started on: http://localhost:${PORT}`))