var net = require('net'),
	repl = require('repl'),
	fs = require('fs'),
	io = require('socket.io').listen(6667);

var port = 6666
var host = 'irc.ozinger.org'
var nickname = '산낚지'
var channels = '#langdev'
var logPath = 'logs/langdev.log'

var actions = [
	[/^PING :(.+)/, function (stream, m) {
		send_line(stream, 'PONG :' + m[1])
	}],
	[/^:(.+?) 001/, function (stream) {
		send_line(stream, 'JOIN ' + channels)
	}],
	[/PRIVMSG/, function () {
		io.sockets.emit('update');
    }],
]

function zerofill(n) {
	if (n >= 10)
		return n.toString()
	else
		return '0' + n
}

function get_date_str(date) {
	var y = date.getFullYear(),
		m = 1 + date.getMonth(),
		d = date.getDate()

	return y + zerofill(m) + zerofill(d)
}

function get_timestamp(date) {
	return date.getFullYear() + '-' + zerofill(date.getMonth() + 1) + '-'
			+ zerofill(date.getDate()) + 'T' + zerofill(date.getHours()) + ':'
			+ zerofill(date.getMinutes()) + ':' + zerofill(date.getSeconds())
}

var logFile = null
var today = get_date_str(new Date)

function rotate_log_file() {
	fs.closeSync(logFile)
	logFile = null
	fs.renameSync(logPath, logPath + '.' + today)
}

function get_log_file(date) {
	var dateStr = get_date_str(date)
	if (today != dateStr) {
		rotate_log_file()
		today = dateStr
	}
	if (!logFile)
		logFile = fs.openSync(logPath, 'a')
	return logFile
}

function log(text) {
	var now = new Date
	var str = '[' + get_timestamp(now) + '] ' + text
	//console.log(str)
	fs.write(get_log_file(now), str + '\n')
}

function send_line(stream, line) {
	log('>>> ' + line)
	stream.write(line + "\r\n")
}

function receive_line(stream, line) {
	log('<<< ' + line)
	var ignore = false;
	actions.forEach(function (pair) {
		if (ignore) return;

		var match = pair[0].exec(line)
		if (match) {
			var stop = pair[1](stream, match)
			if (stop) ignore = true;
		}
	})
}

var stream = net.createConnection(port, host)

stream.on('connect', function () {
	send_line(stream, "USER bot 0 * :fishing")
	send_line(stream, "NICK " + nickname)
})

stream.on('data', function (data) {
	var lines = data.toString('utf8').split('\r\n')
	lines.forEach(function (line) {
		receive_line(stream, line)
	})
})

io.sockets.on('connection', function (socket) {
	socket.on('msg', function (data) {
        send_line(stream, 'PRIVMSG ' + channels + ' :<' + data.nick + '> ' + data.msg)
        io.sockets.emit('update')
    });
});
