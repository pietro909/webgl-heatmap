const morgan = require('../../node_modules/morgan');
const express = require('../../node_modules/express');
const fs = require('fs');
const Transform = require('stream').Transform;
const app = express();

app.set('port', process.env.PORT || 3000);
app.use(express.static('./'));

let coords = [];
fs.readFile(__dirname+'/../../assets/data.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    const rows = data.split('\n');
    coords = rows.map(row => row.split(' '));
});


app.use(morgan('dev'));
app.get('/data', (req, res) => {
    const result = coords.map(latLon => {
        const [u, d, l] = [1,2,3].map(n => Math.random());
            return {
                lat: latLon[0],
                lon: latLon[1],
                uptime: u,
                downtime: d,
                link: l
            };
    });
    res.send(result);
/*
    fs.readFile(__dirname+'/../../assets/data.csv', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        const rows = data.split('\n');
        const result = rows.map(row => {
            const [lat, lon] = row.split(' ');
            const [u, d, l] = [1,2,3].map(n => Math.random());
            return {
                lat: lat,
                lon: lon,
                uptime: u,
                downtime: d,
                link: l
            }
        });
        res.send(result);
        console.log(data);
    });
*/
});

app.listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'));
});
