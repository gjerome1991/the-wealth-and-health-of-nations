Graph = React.createClass({
    
    updateGraph: function(props) {

	// Various accessors that specify the four dimensions of data to visualize.
	function x(d) { return d.income; }
	function y(d) { return d.lifeExpectancy; }
	function radius(d) { return d.population; }
	function color(d) { return d.region; }
	function key(d) { return d.name; }

	// Chart dimensions are specified in getDefaultProps
	// and called in componentDidMount

	var height = props.height;
	var width = props.width;
	var margin = {top: props.marginTop,
		      right: props.marginRight,
		      bottom: props.marginBottom,
		      left: props.marginLeft};

	// Various scales. These domains make assumptions of data, naturally.
	var xScale = d3.scale.log().domain([300, 1e5]).range([0, width]),
	    yScale = d3.scale.linear().domain([10, 85]).range([height, 0]),
	    radiusScale = d3.scale.sqrt().domain([0, 5e8]).range([0, 40]),
	    colorScale = d3.scale.category10();

	// The x & y axes.
	var xAxis = d3.svg.axis().orient("bottom")
		.scale(xScale).ticks(12, d3.format(",d"));
	var yAxis = d3.svg.axis().scale(yScale).orient("left");

	var svg = d3.select("svg")
         	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add the x-axis.
	svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);

	// Add the y-axis.
	svg.append("g")
	    .attr("class", "y axis")
	    .call(yAxis);

	// Add an x-axis label.
	svg.append("text")
	    .attr("class", "x label")
	    .attr("text-anchor", "end")
	    .attr("x", width)
	    .attr("y", height - 6)
	    .text("income per capita, inflation-adjusted (dollars)");

	// Add a y-axis label.
	svg.append("text")
	    .attr("class", "y label")
	    .attr("text-anchor", "end")
	    .attr("y", 6)
	    .attr("dy", ".75em")
	    .attr("transform", "rotate(-90)")
	    .text("life expectancy (years)");


	// Add the year label; the value is set on transition.
	var label = svg.append("text")
		.attr("class", "year label")
		.attr("text-anchor", "end")
		.attr("y", height - 24)
		.attr("x", width)
		.text(1800);

	// Load the data.
	d3.json("data/nations.json", function(nations) {

	    // A bisector since many nation's data is sparsely-defined.
	    var bisect = d3.bisector(function(d) {
		// d here is an array of two values, the first value is the year, the second
		// is the relevant data (in this case either income, population or life expectancy)
                //console.log("d");
		//console.log(d);
		//here we return the year (so we compare with the year to find the index) 
		return d[0];
	    });

	    // Finds (and possibly interpolates) the value for the specified year.
	    function interpolateValues(values, year) {

		//locate the insertion point for 'year' in 'values' array to maintain sorted order
		//the final two arguments '0' and 'values.length -1' are used to specify a subset of
		//the array which should be considered. bisect.left returns the insertion point (index)
		
		var i = bisect.left(values, year, 0, values.length - 1),
		    a = values[i];
//		console.log("a = " + a);
		if (i > 0) {
		    //https://en.wikipedia.org/wiki/Linear_interpolation
		    var b = values[i - 1],
			t = (year - a[0]) / (b[0] - a[0]);
//		    console.log("b = " + b);
		    return a[1] * (1 - t) + b[1] * t;
		}
		return a[1];
	    }
	    
	    // Interpolates the dataset for the given (fractional) year.
	    function interpolateData(year) {
		return nations.map(function(d) {

//		    console.log("d.income");
//		    console.log(d.income);
		    
		    return {
			name: d.name,
			region: d.region,
			income: interpolateValues(d.income, year),
			population: interpolateValues(d.population, year),
			lifeExpectancy: interpolateValues(d.lifeExpectancy, year)
		    };
		});
	    }

	    // Positions the dots based on data.
	    function position(dot) {
		dot .attr("cx", function(d) { return xScale(x(d)); })
		    .attr("cy", function(d) { return yScale(y(d)); })
		    .attr("r", function(d) { return radiusScale(radius(d)); });
	    }

	    // Defines a sort order so that the smallest dots are drawn on top.
	    function order(a, b) {
		return radius(b) - radius(a);
	    }
	    
	    // Add a dot per nation. Initialize the data at 1800, and set the colors.
	    var dot = svg.append("g")
	            .attr("class", "dots")
	            .selectAll(".dot")
	            .data(interpolateData(1800))
	            .enter().append("circle")
	            .attr("class", "dot")
		    .attr("id", function(d) { return d.name; })
	            .style("fill", function(d) { return colorScale(color(d)); })
	            .call(position)
	            .sort(order);

	    
	    //Initiate the voronoi function
	    //Use the same variables of the data in the .x and .y as used in the cx and cy
	    //of the dot call

	    var voronoi = d3.geom.voronoi()
		    .x(function(d) { return xScale(x(d)); })
		    .y(function(d) { return yScale(y(d)); })
		    .clipExtent([[0, 0], [width, height]]);

	    svg.selectAll("path")
		.data(voronoi(interpolateData(1800))) //Use voronoi() with your dataset inside
		.enter().append("path")
		.attr("d", function(d, i) {return "M" + d.join("L") + "Z"; })
		.datum(function(d, i) { return d.point; })
	    //give each cell a unique id where the unique part corresponds to the dot ids
		.attr("id", function(d,i) { return "voronoi" + d.name; })
		.style("stroke", "#2074A0")
		.style("fill", "none")
		.style("pointer-events", "all");
//		.on("mouseover", showTooltip)
//		.on("mouseout", removeTooltip)
		
	    // Add a title.
	    dot.append("title")
	        .text(function(d) { return d.name; });
	    
            // Add an overlay for the year label.
	    var box = label.node().getBBox();

	    var overlay = svg.append("rect")
	            .attr("class", "overlay")
	            .attr("x", box.x)
	            .attr("y", box.y)
	            .attr("width", box.width)
	            .attr("height", box.height)
	            .on("mouseover", enableInteraction);

	    // Start a transition that interpolates the data based on year.
	    svg.transition()
	        .duration(30000)
	        .ease("linear")
	        .tween("year", tweenYear) // remove semicolon if you uncomment below!!!
	        .each("end", enableInteraction);

	    // After the transition finishes, you can mouseover to change the year.
	    //p
	    // Tweens the entire chart by first tweening the year, and then the data.
	    // For the interpolated data, the dots and label are redrawn.
	    function tweenYear() {
		var year = d3.interpolateNumber(1800, 2009);
		return function(t) { displayYear(year(t)); };
	    }

	    // Updates the display to show the specified year.
	    function displayYear(year) {
		// we use a key function to reduce the number of DOM modifications:
		// it allows us to reorder DOM elements in the update selection rather than
		// regenerating them
		//for more information see Mike Bostock's post on Object Constancy
		//https://bost.ocks.org/mike/constancy/
		//or the answer to this stackoverflow question:
		//http://stackoverflow.com/questions/24175624/d3-key-function
		
		dot.data(interpolateData(year), key).call(position).sort(order);
		label.text(Math.round(year));
	    }

	    // After the transition finishes, you can mouseover to change the year.
	    function enableInteraction() {
		var yearScale = d3.scale.linear()
		        .domain([1800, 2009])
		        .range([box.x + 10, box.x + box.width - 10])
		        .clamp(true);

		// Cancel the current transition, if any.
		svg.transition().duration(0);

		overlay
		    .on("mouseover", mouseover)
		    .on("mouseout", mouseout)
		    .on("mousemove", mousemove)
		    .on("touchmove", mousemove);

		function mouseover() {
		    label.classed("active", true);
		}

		function mouseout() {
		    label.classed("active", false);
		}

		function mousemove() {
		    displayYear(yearScale.invert(d3.mouse(this)[0]));
		}
	    }
	    
	});
    },
    
    componentDidMount: function() {
	//this is invoked once when the component is first rendered
	var el = this.getDOMNode(); //this is the div we are rendering

	var marginLeft = this.props.marginLeft;
	var marginRight = this.props.marginRight;
	var marginTop = this.props.marginTop;
	var marginBottom = this.props.marginBottom;
	
	//create the SVG container and set the origin"
	var svg = d3.select(el)
		.append("svg")
		.attr("width", this.props.width + marginLeft + marginRight)
		.attr("height", this.props.height + marginTop + marginBottom);
//	        .append("g")
//		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	this.updateGraph(this.props);
    },

    componentWillUpdate: function(nextProps) {
	//this is invoked every time the props change
	this.updateGraph(nextProps);
    },

    getDefaultProps: function() {
	//this is a protection for the case that not all props are passed
	var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5};

	return {
	    width: 960 - margin.right,
	    height: 500 - margin.top - margin.bottom,
	    marginTop: margin.top,
	    marginBottom: margin.bottom,
	    marginRight: margin.right,
	    marginLeft: margin.left
	}
    },


    render: function() {
	return (
	    <div className="#chart"></div>
	);
    }
});
