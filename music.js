// FFT drawer
var FFTsz = 2048;
var Smoothing = 0.9;
var powBaseRatio = 0.25;
var barNumBase = Math.log2(FFTsz);
var bars = [];
var info = document.getElementById('info');
var ctxInfo = info.getContext('2d');
var music = document.getElementById("myAudio");
var myAudioContext = new AudioContext();
var click_count = 0;
var ratio;
var innerR = 190;
var avgF = 0;

// upload music file
var fileInput;
// ID3 parser
var jsmediatags = window.jsmediatags;

// lodash lib
var _ = window._;

// dynamic progress bar drawer
var angle = 0;
var step = 0.01*Math.PI;
var scaleR = 2;
var scaleStep = 0.25;
var v = 1;

// particle effect drawer
var num_circles = 30;
var max_r = 8;
var min_r = 3;
var max_v = 0.8;
var min_v = 0.5;
var max_vopa = 0.012;
var min_vopa = 0.007;
var margin = 10;
function Circle(){
    return this;
}
Circle.prototype.init = function(){
    this.v = {x: 0, y: 0};
    var x = info.width / (2 * ratio);
    var y = info.height / (2 * ratio);
    this.theta = Math.random() * Math.PI * 2;
    var vxy = Math.random() * (max_v - min_v) + min_v;
    this.v.x = vxy * Math.sin(this.theta);
    this.v.y = vxy * -Math.cos(this.theta);
    this.r = Math.random() * (max_r - min_r) + min_r;
    var p = thetaR2xy(this.theta, innerR + avgF + margin, x, y);
    this.cx = p.x;
    this.cy = p.y;
    this.opacity = 1;
    this.vopa = Math.random() * (max_vopa - min_vopa) + min_vopa;
}
Circle.prototype.next = function(){
    this.cx += this.v.x;
    this.cy += this.v.y;
    this.opacity -= this.vopa;
    if(this.opacity <= 0) this.init();
}
Circle.prototype.draw = function(cont){
    cont.beginPath();
    var ga = cont.globalAlpha;
    cont.arc(this.cx, this.cy, this.r, 0, Math.PI * 2);
    cont.globalAlpha = this.opacity;
    cont.fill();
    cont.globalAlpha = ga;
}
function Circles(){
    return this;
}
Circles.prototype.init = function(){
    this.num = num_circles;
    this.list = [];
    for(var i=0; i<this.num; i++){
        var t = new Circle();
        t.init();
        this.list.push(t);
    }
}
Circles.prototype.next = function(){
    for(var i=0; i<this.num; i++){
        this.list[i].next();
    }
}
Circles.prototype.draw = function(cont){
    for(var i=0; i<this.num; i++){
        this.list[i].draw(cont);
    }
}
var circles = new Circles();

// color tables
var color_groups = [
    [{pos: 0, code: 'rgb(122,161,210)'}, {pos: 0.4, code: 'rgb(219,212,180)'}, {pos: 0.7, code: 'rgb(204,149,192)'}],
    [{pos: 0, code: 'rgb(247,121,125)'}, {pos: 0.4, code: 'rgb(251,215,134)'}, {pos: 0.7, code: 'rgb(198,255,221)'}]
];

// music
var player = {
    musicPath: "",
    musicName: "等待上传...",
    musicAuthor: "请上传MP3文件",
    musicALbum: "如果上传后没有自动开始播放，需要点击圆圈",
    musicState: "ready"
};

window.onload = function () {
    // myAudioContext.resume().then(function(){
    //     console.log("Resume");
    //     // create music file input
    //     fileInput = document.createElement('input');
    //     fileInput.type = 'file';
    //     fileInput.onchange = function(){
    //         var fileName = fileInput.files[0].name;
    //         console.log(fileName);
    //         change_music(fileName);
    //     };
    //     // draw
    //     draw_all();
    // });
    console.log("Resume");
    // create music file input
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = function(){
        // var fileName = fileInput.files[0].name;
        var fileName = URL.createObjectURL(fileInput.files[0]);
        console.log(fileName);
        change_music(fileName);
    };
    // draw
    draw_all();
};

function click_input(){
    if(fileInput === undefined || fileInput === null) return;
    fileInput.click();
}

var analyser;
function prepare_pic() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
    var source = myAudioContext.createMediaElementSource(music);
    analyser = myAudioContext.createAnalyser();
    analyser.fftSize = FFTsz;
    analyser.smoothingTimeConstant = Smoothing;
    source.connect(analyser);
    analyser.connect(myAudioContext.destination);
    var processor = myAudioContext.createScriptProcessor(1024);
    processor.connect(myAudioContext.destination);
    analyser.connect(processor);
}

// position transfer
function thetaR2xy(theta, r, cx, cy){
    var x = Math.round(cx + r * Math.sin(theta));
    var y = Math.round(cy - r * Math.cos(theta));
    return {
        x: x,
        y: y
    };
}

// draw curve smoothly
function draw_smooth_curve(cont, data, index, cx, cy){
    var num_inds = index.length;
    var ind = function(i){
        return (i + num_inds) % num_inds;
    }
    var middle = function(p1, p2){
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }
    for(var i=0; i<num_inds; i++){
        if(i === 0){
            var theta0 = 2 * Math.PI * ind(i-1) / num_inds;
            var theta1 = 2 * Math.PI * ind(i) / num_inds;
            var theta2 = 2 * Math.PI * ind(i+1) / num_inds;
            var point0 = thetaR2xy(theta0, data[index[ind(i-1)]], cx, cy);
            var point1 = thetaR2xy(theta1, data[index[ind(i)]], cx, cy);
            var point2 = thetaR2xy(theta2, data[index[ind(i+1)]], cx, cy);
            var s = middle(point0, point1);
            var e = middle(point1, point2);
            cont.moveTo(s.x, s.y);
            cont.quadraticCurveTo(point1.x, point1.y, e.x, e.y);
        }
        else{
            var theta1 = 2 * Math.PI * ind(i) / num_inds;
            var theta2 = 2 * Math.PI * ind(i+1) / num_inds;
            var point1 = thetaR2xy(theta1, data[index[ind(i)]], cx, cy);
            var point2 = thetaR2xy(theta2, data[index[ind(i+1)]], cx, cy);
            var e = middle(point1, point2);
            cont.quadraticCurveTo(point1.x, point1.y, e.x, e.y);
        }
    }
}

// draw FFT result
function draw_pic(cont, w, h, d) {
    var contCenter = {
        x: w / (2 * ratio), 
        y: h / (2 * ratio)
    };
    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    var data = Array.from(array);
    var avg = 0;
    if(data !== null && data !== undefined){
        for(var i=0; i<data.length; i++){
            avg += data[i] / 255;
        }
        avg = avg / data.length * 50;
    }
    avgF = Math.min(avg, 50);
    var points = data.map(function(element){
        return d + avgF + element / 3;
    });
    var powBase = Math.pow(2, powBaseRatio);
    var inds = [];
    var exp = 0;
    while(true){
        var pows = Math.round(Math.pow(powBase, exp) - 1);
        if(pows >= points.length) break;
        inds.push(pows);
        exp ++;
    }
    var unique_inds = _.uniq(inds);
    cont.beginPath();
    cont.lineWidth = 3;
    // cont.lineCap = "round";
    draw_smooth_curve(cont, points, unique_inds, contCenter.x, contCenter.y);
    // cont.strokeStyle = "rgba(255,255,255,0.7)";
    cont.stroke();
}

// draw music info
function draw_info() {
    ctxInfo.clearRect(0,0,info.width,info.height);
    ctxInfo.save();

    var cx = info.width/(2*ratio);
    var cy = info.height/(2*ratio);

    // draw progress
    var gradient = ctxInfo.createRadialGradient(cx, cy, innerR + avgF, cx, cy, 275);
    var selector = 1;
    for(var i=0; i<color_groups[selector].length; i++){
        gradient.addColorStop(color_groups[selector][i].pos, color_groups[selector][i].code);
    }
    ctxInfo.beginPath();
    ctxInfo.strokeStyle = gradient;
    ctxInfo.fillStyle = gradient;
    ctxInfo.lineWidth = 3;
    var r;
    if(player.musicName) r = music.currentTime / music.duration * 2 * Math.PI;
    else r = 0;
    ctxInfo.arc(cx, cy, innerR + avgF, -Math.PI/2, -Math.PI/2+r);
    var ga = ctxInfo.globalAlpha;
    ctxInfo.globalAlpha = 0.3;
    ctxInfo.stroke();
    ctxInfo.beginPath();
    ctxInfo.lineWidth = 2;
    ctxInfo.arc(cx, cy, innerR + avgF, -Math.PI/2+r, Math.PI*3/2);
    ctxInfo.globalAlpha = 0.7;
    ctxInfo.stroke();
    ctxInfo.globalAlpha = ga;
    draw_pic(ctxInfo, info.width, info.height, 200);
    circles.draw(ctxInfo);
    circles.next();

    // draw information
    var firstVerticalDeviation = 30;
    var secondVerticalDeviation = 60;
    var thirdVerticalDeviation = 70;
    var name, author, album;
    if(player.musicName !== undefined){
        name = player.musicName;
    }
    else name = "";
    if(player.musicAuthor !== undefined){
        author = player.musicAuthor;
    }
    else author = "";
    if(player.musicALbum !== undefined){
        album = player.musicALbum;
    }
    else album = "";

    ctxInfo.textAlign = 'center';
    ctxInfo.font = "22px Microsoft YaHei";
    ctxInfo.fillStyle = 'white';
    ctxInfo.fillText(author, info.width/(2*ratio), info.height/(2*ratio)+firstVerticalDeviation,300);

    var fontSize = 35;
    if(name.length > 6) fontSize = fontSize - Math.round((name.length - 6) / 2);
    if(fontSize <= 20) fontSize = 20;
    ctxInfo.font = fontSize.toString() + "px Microsoft YaHei";
    ctxInfo.fillText(name, info.width/(2*ratio), info.height/(2*ratio)-secondVerticalDeviation,300);

    var fontSize = 12;
    if(name.length > 16) fontSize = fontSize - Math.round((name.length - 16) / 4);
    if(fontSize <= 8) fontSize = 8;
    ctxInfo.font = fontSize.toString() + "px Microsoft YaHei";
    ctxInfo.fillText(album, info.width/(2*ratio), info.height/(2*ratio)+thirdVerticalDeviation,300);

    // draw dot
    var xpos = info.width/(2*ratio) + Math.sin(r) * (innerR + avgF);
    var ypos = info.height/(2*ratio) - Math.cos(r) * (innerR + avgF);

    ctxInfo.beginPath();
    ctxInfo.arc(xpos, ypos, scaleR, 0, 2*Math.PI);
    ctxInfo.fillStyle = "rgba(255,255,255,0.3)";
    ctxInfo.fill();

    ctxInfo.beginPath();
    ctxInfo.arc(xpos, ypos, 8, 0, 2*Math.PI);
    ctxInfo.fillStyle = "rgba(255,255,255,0.9)";
    ctxInfo.fill();

    ctxInfo.beginPath();
    ctxInfo.lineWidth = 6;
    ctxInfo.arc(xpos, ypos, 15, angle, angle + Math.PI/3);
    ctxInfo.strokeStyle = "rgba(255,255,255,0.7)";
    ctxInfo.stroke();

    ctxInfo.beginPath();
    ctxInfo.lineWidth = 6;
    ctxInfo.arc(xpos, ypos, 15, angle + Math.PI, angle + Math.PI*4/3);
    ctxInfo.strokeStyle = "rgba(255,255,255,0.7)";
    ctxInfo.stroke();

    ctxInfo.restore();

    // update variables
    angle = angle + step;
    if(angle >= Math.PI * 2) angle = angle - Math.PI*2;
    scaleR += scaleStep * v;
    if(scaleR >= 32) v = -1;
    if(scaleR <= 2) v = 1;
}

function init_music() {
    // load music information from ID3
    if(fileInput !== undefined && fileInput.files.length > 0) {
        jsmediatags.read(fileInput.files[0], {
            onSuccess: function(tag) {
                player.musicName = tag.tags.title;
                player.musicAuthor = tag.tags.artist;
                player.musicALbum = tag.tags.album;
            },
            onError: function(error) {
                alert(error);
            }
        });
    }

    if(player.musicPath !== ''){
        music.src = player.musicPath;
        music.load();
        var promise = music.play();
        if (promise !== undefined) {
          promise.then(function(_) {
            console.log("music play successfully.");
            player.musicState = 'playing';
          }).catch(function(error) {
            console.log(error);
          });
        }
    }
}

function change_music(path){
    if(music === undefined || music === null){
        player.musicPath = path;
        player.musicState = 'ready';
        init_music();
    }
    else{
        music.pause();
        player.musicPath = path;
        init_music();
    }
}

function change_music_state(){
	click_count += 1;
	if(click_count == 1){
		myAudioContext.resume().then(function(){
			console.log('AudioContext resume successfully.');
			init_music();
		});
	}
    else if(player.musicPath === ''){
        return;
    }
	else{
	    if(player.musicState === 'ready'){
	        init_music();
	    }
	    else if(player.musicState === 'paused'){
	        music.play();
	        player.musicState = 'playing';
	    }
	    else if(player.musicState === 'playing'){
	        music.pause();
	        player.musicState = 'paused';
	    }
	}
}

function init_canvas(canvas, context, height, width) {
    canvas.width = width;
    canvas.height = height;

    // finally query the various pixel ratios
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;
    ratio = devicePixelRatio / backingStoreRatio;

    // upscale the canvas if the two ratios don't match
    if (devicePixelRatio !== backingStoreRatio) {

        var oldWidth = canvas.width;
        var oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        // now scale the context to counter
        // the fact that we've manually scaled
        // our canvas element
        context.scale(ratio, ratio);
    }
}

function initCanvases() {
    init_canvas(info, ctxInfo, 650, 650);
}

function draw_all() {
    //draw one animation frame
    var draw_frame = function () {
        draw_info();
        requestAnimationFrame(draw_frame);
    };
    //initialize audio nodes
    prepare_pic();
    // initialize canvas
    initCanvases();
    // init circles
    circles.init();

    requestAnimationFrame(draw_frame);
}
