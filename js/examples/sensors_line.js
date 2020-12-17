var my_viz = new function() {

    var base_url = 'https://ecoengine.berkeley.edu/api/sensors/';
    var d3canvas;

    function create_url(interval, sensor, start, end) {
        url =  base_url + sensor + '/aggregate/?format=json&page_size=10000&min_date=' + start + "&max_date=" + end + "&interval=" + interval;
	return url
    }

    function D3Obj(){
        this.data
        this.margin = {top: 20, right: 20, bottom: 30, left: 50};
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;

	this.x = d3.time.scale()
            .range([0, this.width]);

        this.y = d3.scale.linear()
            .range([this.height, 0]);

        this.xAxis = d3.svg.axis()
            .scale(this.x)
            .orient("bottom");

        this.yAxis = d3.svg.axis()
            .scale(this.y)
            .orient("left");

        this.format = d3.time.format("%Y-%m-%dT%H:%M:%S");
        this.svg = d3.select("#canvas").append("svg")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.height + this.margin.top + this.margin.bottom)
              .append("g")
                .attr("transform", "translate(" + this.margin.left + "," + (this.margin.top) + ")");

        this.rect = this.svg.append("svg:rect")
            .attr("class", "pane")
            .attr("width", this.width)
            .attr("height", this.height);

        var div = d3.select("#canvas").append("div")
            .attr("class", "tooltip_box")
            .style("opacity", 1);

        this.path2 = this.svg.append("path").attr("class", "line");
        var circle = this.svg.append("circle").attr("r", 4).attr("cx", 0).attr("cy", 0).attr("class", "circle").attr("opacity", 0);
        var tooltip = circle.append("svg:text");
        this.svg.append("g").attr("class", "x_axis").attr("transform", "translate(0," + this.height + ")");
        this.svg.append("g").attr("class", "y_axis").attr("y", 6).attr("dy", ".71em");
        that = this;
        this.rect.on("mousemove", function(event){
            // http://jsfiddle.net/D4MRP/15/
            // var pathData = that.path.data();
            var pathData = that.path2.data();
            var X_px = d3.mouse(this)[0],
                X_date = that.format(that.x.invert(X_px)),
                Y_val, X_val;
	    // TODO: band aid fix!
	    if (pathData[0]) {
		pathData[0].forEach(function(element, index, array){
		    if (
		    (index+1 < array.length) && (array[index].begin_date <= X_date) && (array[index+1].begin_date >= X_date)
		    ) {
		        if (X_date-array[index].begin_date < array[index+1].begin_date-X_date) {
		            Y_val = array[index].mean;
		            X_val = array[index].begin_date;
		        } else {
		            Y_val = array[index+1].mean;
		            X_val = array[index+1].begin_date;
		        }
		    }
		})
            };
            Y_px = that.y(Y_val);
            X_px = that.x(that.format.parse(X_val));
            var tt = that.format.parse(X_val)
            //var timestring = [tt.getFullYear(), '-', tt.getMonth(), '-', tt.getDay()].join('')
            var timestring = d3.time.format("%Y %b %e &nbsp;%I:%M%p")
            var tooltime = timestring(tt)
            circle.attr("opacity", 1).attr("cx", X_px).attr("cy", Y_px);
	    if (Y_val !== null) {
		d3.select(".tooltip_box").html("<b>Date:</b> " + tooltime + "<br><span style='color:#E04E39'><b>Value:</b></span> " + Number((Y_val).toFixed(3)));
	    }
	    else {
		d3.select(".tooltip_box").html("<b>Date:</b> " + tooltime + "<br><span style='color:#E04E39'><b>Value:</b></span> null");
	    }
        });


	this.update = function(json){

	    this.data = json.results;
	    var that = this;

	    var line = d3.svg.line()
		.x(function(d) { return that.x(that.format.parse(d.begin_date));})
		//.y0(height) use for area - also need to change y below to y1
		.y(function(d) { return that.y(d.mean); });

	    that.x.domain(d3.extent(that.data, function(d) { return that.format.parse(d.begin_date); }));
	    that.y.domain(d3.extent(that.data, function(d) { return d.mean; }));

	    that.svg.selectAll(".x_axis")
		.transition().duration(750).delay(500)
		.call(that.xAxis);

	    that.svg.selectAll(".y_axis")
		.transition().duration(750).delay(500)
		.call(that.yAxis)

	    this.path = that.svg.selectAll(".line")
		.datum(that.data)
		.transition().duration(750).delay(500)
		.attr("d", line);
	}
    }


    function Chart(interval, sensor, start, end){

        this.interval = interval;
        this.sensor = sensor;
        this.start = start;
        this.end = end;

	this.update = function(args){
	// looping through argument literal and updating property when in literal
	    for(var item in args) {
		this[item] = args[item];
	    }
	    url = create_url(this.interval, this.sensor, this.start, this.end);

	    $.ajax({
		type: 'GET',
		url: url,
		contentType: 'application/json',
		dataType: 'json',
		success: function(json) {
            d3canvas.update(json);
		},
		error: function(e) {
		    console.log(e.message);
		}
	    });

	};
    }

    function my_init() {
        var chart = new Chart("weeks", "1621", "1998-01-01", "2013-12-31");
        d3canvas = new D3Obj();

	// update on initial load
	chart.update()

        $('#interval_select').change(function(event){
            interval = event.target.value;
            chart.update({interval: interval})
        });

        $('#sensor_select').change(function(event){
            sensor = event.target.value;
            chart.update({sensor: sensor})
        });

    }

    $(document).ready(
        function(){
            my_init()
        }
    )

}
