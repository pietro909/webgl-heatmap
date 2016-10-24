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
        // sending as string is roughly 67% of the json payload
        return `${latLon[0]},${latLon[1]},${u},${d},${l}`
    });
    res.send(result);
});

app.listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'));
});
