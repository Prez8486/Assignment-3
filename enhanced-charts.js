document.addEventListener("DOMContentLoaded", function() {
  // Chart 1: Health Resources (Stacked Bar Chart)
  d3.csv("data1.csv").then(function(data) {
    const countrySelect = d3.select("#countryFilter1");
    const countries = Array.from(new Set(data.map(d => d.Country))).sort();
    countrySelect.append("option").text("All").attr("value", "All");
    countries.forEach(c => countrySelect.append("option").text(c).attr("value", c));

    function drawChart1(country) {
      d3.select("#chart1").html("");
      const filtered = country === "All" ? data : data.filter(d => d.Country === country);
      const valid = filtered.filter(d => d['Observation value'] && !isNaN(+d['Observation value']));

      const measureCounts = {};
      valid.forEach(d => {
        const m = d['Unit of measure'];
        if (m) measureCounts[m] = (measureCounts[m] || 0) + 1;
      });
      const indicators = Object.keys(measureCounts).sort((a, b) => measureCounts[b] - measureCounts[a]).slice(0, 3);
      const regions = Array.from(new Set(valid.map(d => d['Reference area'])));
      const stackedData = regions.map(region => {
        const row = { region: region };
        indicators.forEach(indicator => {
          const entry = valid.find(d => d['Reference area'] === region && d['Unit of measure'] === indicator);
          row[indicator] = entry ? +entry['Observation value'] : 0;
        });
        return row;
      });

      const margin = { top: 30, right: 20, bottom: 60, left: 60 },
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

      const svg = d3.select("#chart1").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().domain(regions).range([0, width]).padding(0.2);
      const y = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => indicators.reduce((sum, k) => sum + d[k], 0))])
        .nice().range([height, 0]);
      const color = d3.scaleOrdinal().domain(indicators).range(d3.schemeSet2);

      const stack = d3.stack().keys(indicators);
      const series = stack(stackedData);

      svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => x(d.data.region))
        .attr("y", height)
        .attr("height", 0)
        .attr("width", x.bandwidth())
        .on("mouseover", function(event, d) {
          d3.selectAll("rect").style("opacity", 0.3);
          d3.selectAll(`rect[x='${x(d.data.region)}']`).style("opacity", 1).style("stroke", "black");
          showTooltip(event, `Region: ${d.data.region}`);
        })
        .on("mouseout", function() {
          d3.selectAll("rect").style("opacity", 1).style("stroke", null);
          hideTooltip();
        })
        .transition()
        .duration(800)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]));

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)).selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      svg.append("g").call(d3.axisLeft(y));
    }

    countrySelect.on("change", function() { drawChart1(this.value); });
    drawChart1("Australia");
  });

  // Chart 2: Update to respect year filter
  d3.csv("data3.csv").then(function (data) {
    const measureSelect = d3.select("#measureFilter2");
    const measures = Array.from(new Set(data.map(d => d.MEASURE))).sort();
    measures.forEach(m => measureSelect.append("option").text(m).attr("value", m));

    function drawChart2(measure) {
      d3.select("#chart2").html("");
      const selectedYear = +document.getElementById("timeRange").value;
      const filtered = data.filter(d =>
        d.Country === "Australia" &&
        d.MEASURE === measure &&
        d.OBS_VALUE &&
        +d.TIME_PERIOD <= selectedYear
      );

      const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

      const svg = d3.select("#chart2").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const regions = Array.from(new Set(filtered.map(d => d['Reference area'])));
      const x = d3.scaleLinear().domain(d3.extent(filtered, d => +d.TIME_PERIOD)).range([0, width]);
      const y = d3.scaleLinear().domain(d3.extent(filtered, d => +d.OBS_VALUE)).range([height, 0]);
      const color = d3.scaleOrdinal().domain(regions).range(d3.schemeTableau10);

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      svg.append("g").call(d3.axisLeft(y));

      const line = d3.line().x(d => x(+d.TIME_PERIOD)).y(d => y(+d.OBS_VALUE));

      regions.forEach(region => {
        const regionData = filtered.filter(d => d['Reference area'] === region);
        svg.append("path")
          .datum(regionData)
          .attr("fill", "none")
          .attr("stroke", color(region))
          .attr("stroke-width", 2)
          .attr("d", line);
      });

      const avg = d3.mean(filtered, d => +d.OBS_VALUE);
      svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(avg))
        .attr("y2", y(avg))
        .attr("stroke", "red")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 1.5);

      svg.append("text")
        .attr("x", 10)
        .attr("y", y(avg) - 10)
        .text(`Avg: ${avg.toFixed(1)}`)
        .attr("fill", "red")
        .style("font-size", "12px");
    }

    measureSelect.on("change", () => drawChart2(measureSelect.property("value")));
    document.getElementById("timeRange").addEventListener("input", () => drawChart2(measureSelect.property("value")));
    drawChart2("LFEXP");
  });

  // Chart 3: Sorted Bar Chart
  d3.csv("data2.csv").then(function (data) {
    const measureSelect = d3.select("#measureFilter3");

    function drawChart3(measure) {
      d3.select("#chart3").html("");
      const filtered = data.filter(d => d.Country === "Australia" && d.MEASURE === measure && d.OBS_VALUE);
      const grouped = {};
      filtered.forEach(d => {
        const key = d['Reference area'];
        if (!grouped[key] || +d.TIME_PERIOD > +grouped[key].TIME_PERIOD) {
          grouped[key] = d;
        }
      });

      const latest = Object.values(grouped);
      const sortType = document.getElementById("sortChart3").value;
      latest.sort((a, b) => {
        if (sortType === "value") return +b.OBS_VALUE - +a.OBS_VALUE;
        return a['Reference area'].localeCompare(b['Reference area']);
      });

      const margin = { top: 30, right: 30, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

      const svg = d3.select("#chart3").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().domain(latest.map(d => d['Reference area'])).range([0, width]).padding(0.2);
      const y = d3.scaleLog().domain([1, d3.max(latest, d => +d.OBS_VALUE)]).range([height, 0]);

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)).selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      svg.append("g").call(d3.axisLeft(y));

      svg.selectAll("rect")
        .data(latest)
        .join("rect")
        .attr("x", d => x(d['Reference area']))
        .attr("y", height)
        .attr("height", 0)
        .attr("width", x.bandwidth())
        .attr("fill", "steelblue")
        .on("mouseover", function (event, d) {
          d3.selectAll("rect").style("opacity", 0.3);
          d3.select(this).style("opacity", 1).style("stroke", "black");
          showTooltip(event, `${d['Reference area']}: ${d.OBS_VALUE}`);
        })
        .on("mouseout", function () {
          d3.selectAll("rect").style("opacity", 1).style("stroke", null);
          hideTooltip();
        })
        .transition()
        .duration(1000)
        .attr("y", d => y(+d.OBS_VALUE))
        .attr("height", d => height - y(+d.OBS_VALUE));
    }

    measureSelect.on("change", () => drawChart3(measureSelect.property("value")));
    document.getElementById("sortChart3").addEventListener("change", () => drawChart3(measureSelect.property("value")));
    drawChart3(document.getElementById("measureFilter3").value);
  });

  
});
