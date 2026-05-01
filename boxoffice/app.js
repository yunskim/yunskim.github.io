const state = {
  data: null,
  allTimeData: null,
  longestSpellData: null,
  halfLifeData: null,
  movieSearchIndex: null,
  movieSearchResults: [],
  movieSearchMessage: "영화명을 입력하면 후보가 표시됩니다.",
  searchMovies: [],
  selectedMovies: [],
  selectedAllTimeMovies: [],
  selectedLongestSpellMovies: [],
  selectedHalfLifeMovies: [],
  selectedSearchMovies: [],
  searchShardCache: new Map(),
};

const formatNumber = d3.format(",");
const formatRatio = d3.format(".1f");
const formatDecimal = d3.format(",.1f");
const color = d3.scaleOrdinal(d3.schemeTableau10);
const allTimeColor = d3.scaleOrdinal(d3.schemeTableau10);
const longestSpellColor = d3.scaleOrdinal(d3.schemeTableau10);
const halfLifeColor = d3.scaleOrdinal(d3.schemeTableau10);
const searchColor = d3.scaleOrdinal(d3.schemeTableau10);

const svg = d3.select("#trajectoryChart");
const concentrationSvg = d3.select("#concentrationChart");
const allTimeSvg = d3.select("#allTimeTrajectoryChart");
const longestSpellSvg = d3.select("#longestSpellTrajectoryChart");
const halfLifeSvg = d3.select("#halfLifeTrajectoryChart");
const searchSvg = d3.select("#searchTrajectoryChart");
const tooltip = d3.select("#tooltip");
const concentrationTooltip = d3.select("#concentrationTooltip");
const allTimeTooltip = d3.select("#allTimeTooltip");
const longestSpellTooltip = d3.select("#longestSpellTooltip");
const halfLifeTooltip = d3.select("#halfLifeTooltip");
const searchTooltip = d3.select("#searchTooltip");
const dateFilter = d3.select("#dateFilter");
const movieFilter = d3.select("#movieFilter");
const movieSearchInput = d3.select("#movieSearchInput");
const menuToggle = d3.select("#menuToggle");
const chartControls = d3.select("#chartControls");
const mobileQuery = window.matchMedia("(max-width: 720px)");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const dataVersion = document.documentElement.dataset.dataVersion || Date.now().toString();

function dataUrl(path) {
  return `${path}?v=${encodeURIComponent(dataVersion)}`;
}

function isMobileLayout() {
  return mobileQuery.matches;
}

function setMobileMenu(open) {
  menuToggle.attr("aria-expanded", open ? "true" : "false");
  menuToggle.attr("aria-label", open ? "차트 설정 닫기" : "차트 설정 열기");
  chartControls.classed("is-open", open);
}

function activateMovie(movieCode) {
  d3.selectAll(".movie").classed("is-active", (d) => d.movie_code === movieCode);
  d3.selectAll(".legend-item").classed("is-active", (d) => d.movie_code === movieCode);
  d3.selectAll(".trajectory-arrow").attr("fill", (d) => (d.movie_code === movieCode ? d.chart_color || color(d.movie_code) : "#aeb5bf"));
  d3.selectAll(".trajectory-motion").classed("is-active", (d) => d.movie_code === movieCode);
}

function clearActiveMovie() {
  d3.selectAll(".movie").classed("is-active", true);
  d3.selectAll(".trajectory-arrow").attr("fill", (d) => d.chart_color || color(d.movie_code));
  d3.selectAll(".trajectory-motion").classed("is-active", false);
}

function updateColorDomain() {
  const currentCodes = state.data?.movies?.map((movie) => movie.movie_code) ?? [];
  const allTimeCodes = state.allTimeData?.movies?.map((movie) => movie.movie_code) ?? [];
  const longestSpellCodes = state.longestSpellData?.movies?.map((movie) => movie.movie_code) ?? [];
  const halfLifeCodes = state.halfLifeData?.movies?.map((movie) => movie.movie_code) ?? [];
  const searchCodes = state.searchMovies.map((movie) => movie.movie_code);
  color.domain([...new Set([...currentCodes, ...allTimeCodes, ...longestSpellCodes, ...halfLifeCodes, ...searchCodes])]);
  allTimeColor.domain(allTimeCodes);
  longestSpellColor.domain(longestSpellCodes);
  halfLifeColor.domain(halfLifeCodes);
  searchColor.domain(searchCodes);
}

function pointRole(point, movie, latestLabel = "최신") {
  const points = moviePoints(movie);
  const first = points[0];
  const latest = points[points.length - 1];
  if (!first || !latest) return "경로";
  if (point.date === first.date) return point.days_since_release === 0 ? "개봉 시작" : "관측 시작";
  if (point.date === latest.date) return latestLabel;
  return "경로";
}

function moviePoints(movie) {
  return movie.weekly_points ?? [];
}

function searchMoviePoints(movie) {
  return moviePoints(movie);
}

function concentrationData() {
  return state.data?.concentration?.weekly ?? null;
}

function shortMovieName(name) {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

function normalizeSearchText(value) {
  return (value ?? "").toString().trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function incompleteOriginalReleaseLabel(movie) {
  if (!movie.has_incomplete_original_release) return "";
  const coverageStart = state.movieSearchIndex?.coverage_start_date ?? "DB 관측 시작일";
  return `원개봉 초기 자료 없음 · ${coverageStart} 이후 관측`;
}

function latestArrowTransform(movie, x, y) {
  const points = moviePoints(movie);
  const latest = points[points.length - 1];
  const previous = [...points]
    .reverse()
    .slice(1)
    .find((point) => point.screen_count !== latest.screen_count || point.audience_per_screen !== latest.audience_per_screen);
  const start = previous ?? points[0] ?? latest;
  const latestX = x(latest.screen_count);
  const latestY = y(latest.audience_per_screen);
  const angle = Math.atan2(latestY - y(start.audience_per_screen), latestX - x(start.screen_count)) * (180 / Math.PI);
  const radians = angle * (Math.PI / 180);
  const offset = 10;
  return `translate(${latestX + Math.cos(radians) * offset},${latestY + Math.sin(radians) * offset}) rotate(${angle})`;
}

function latestStopTransform(movie, x, y) {
  const points = moviePoints(movie);
  const latest = points[points.length - 1];
  return `translate(${x(latest.screen_count)},${y(latest.audience_per_screen)})`;
}

function latestSearchArrowTransform(movie, x, y) {
  const points = searchMoviePoints(movie);
  const latest = points[points.length - 1];
  const previous = [...points]
    .reverse()
    .slice(1)
    .find((point) => point.screen_count !== latest.screen_count || point.audience_per_screen !== latest.audience_per_screen);
  const start = previous ?? points[0] ?? latest;
  const latestX = x(latest.screen_count);
  const latestY = y(latest.audience_per_screen);
  const angle = Math.atan2(latestY - y(start.audience_per_screen), latestX - x(start.screen_count)) * (180 / Math.PI);
  const radians = angle * (Math.PI / 180);
  const offset = 10;
  return `translate(${latestX + Math.cos(radians) * offset},${latestY + Math.sin(radians) * offset}) rotate(${angle})`;
}

function isRerelease(movie) {
  return movie.release_type === "rerelease";
}

function releaseLabel(movie) {
  return isRerelease(movie) ? "재개봉일" : "개봉일";
}

function statusLabel(movie, latest) {
  if (!latest) return "-";
  const prefix = isRerelease(movie) ? "재개봉 상영 중 · " : "";
  return `${prefix}${latest.week_number}주차 · ${latest.days_since_release}일차`;
}

function latestWeeklyPoint(movie) {
  return movie.weekly_points?.[movie.weekly_points.length - 1] ?? null;
}

function latestTrajectoryPoint(movie) {
  const points = moviePoints(movie);
  return points[points.length - 1] ?? null;
}

function firstSpellWeeklyAverageAudience(movie) {
  const audience = movie.first_spell_audience_accumulated ?? movie.latest_audience_accumulated ?? 0;
  const weeks = movie.comparison_week_count ?? latestWeeklyPoint(movie)?.week_number ?? 0;
  return weeks > 0 ? Math.round(audience / weeks) : null;
}

function firstSpellAverageWeeklyScreen(movie) {
  const screens = movie.weekly_points?.map((point) => point.screen_count).filter((value) => Number.isFinite(value) && value > 0) ?? [];
  return screens.length ? d3.mean(screens) : null;
}

function firstSpellWeeklyAudiencePerAverageScreen(movie) {
  const weeklyAudience = firstSpellWeeklyAverageAudience(movie);
  const weeklyScreen = firstSpellAverageWeeklyScreen(movie);
  return weeklyAudience !== null && weeklyScreen ? weeklyAudience / weeklyScreen : null;
}

function movieMetricRows(movie) {
  const latestWeek = latestWeeklyPoint(movie);
  return [
    ["누적 관객", formatNumber(movie.latest_audience_accumulated ?? latestWeek?.audience_accumulated ?? 0)],
    ["주간 관객", latestWeek ? formatNumber(latestWeek.weekly_audience_count) : "-"],
    ["주간 평균 스크린", latestWeek ? formatDecimal(latestWeek.screen_count) : "-"],
    ["주간 관객/주간 평균 스크린", latestWeek ? formatDecimal(latestWeek.audience_per_screen) : "-"],
  ];
}

function renderMetricRows(movie) {
  return movieMetricRows(movie)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function flattenPoints(movies) {
  return movies.flatMap((movie) =>
    moviePoints(movie).map((point) => ({
      ...point,
      movie_code: movie.movie_code,
      movie_name: movie.movie_name,
      release_date: movie.release_date,
      release_type: movie.release_type,
    })),
  );
}

function visibleMovies() {
  if (!state.data) return [];
  return selectedMovies();
}

function selectedMovies() {
  if (!state.data || !state.data.movies.length) return [];
  const selected = state.data.movies.filter((movie) => state.selectedMovies.includes(movie.movie_code));
  return selected.length ? selected : [state.data.movies[0]];
}

function selectedAllTimeMovies() {
  if (!state.allTimeData || !state.allTimeData.movies.length) return [];
  const selected = state.allTimeData.movies.filter((movie) => state.selectedAllTimeMovies.includes(movie.movie_code));
  return selected.length ? selected : [state.allTimeData.movies[0]];
}

function selectedLongestSpellMovies() {
  if (!state.longestSpellData || !state.longestSpellData.movies.length) return [];
  const selected = state.longestSpellData.movies.filter((movie) => state.selectedLongestSpellMovies.includes(movie.movie_code));
  return selected.length ? selected : [state.longestSpellData.movies[0]];
}

function selectedHalfLifeMovies() {
  if (!state.halfLifeData || !state.halfLifeData.movies.length) return [];
  const selected = state.halfLifeData.movies.filter((movie) => state.selectedHalfLifeMovies.includes(movie.movie_code));
  return selected.length ? selected : [state.halfLifeData.movies[0]];
}

function selectedSearchMovies() {
  if (!state.searchMovies.length) return [];
  const selected = state.searchMovies.filter((movie) => state.selectedSearchMovies.includes(movie.movie_code));
  return selected.length ? selected : [];
}

function isSelected(movieCode) {
  return state.selectedMovies.includes(movieCode);
}

function isAllTimeSelected(movieCode) {
  return state.selectedAllTimeMovies.includes(movieCode);
}

function isLongestSpellSelected(movieCode) {
  return state.selectedLongestSpellMovies.includes(movieCode);
}

function isHalfLifeSelected(movieCode) {
  return state.selectedHalfLifeMovies.includes(movieCode);
}

function isSearchSelected(movieCode) {
  return state.selectedSearchMovies.includes(movieCode);
}

function addSelectedMovie(movieCode) {
  if (!isSelected(movieCode)) state.selectedMovies.push(movieCode);
  movieFilter.property("value", movieCode);
  renderChart();
  renderSelectedSummary();
  renderMovieChips();
}

function resetAllTimeSelections() {
  if (!state.allTimeData?.movies?.length) {
    state.selectedAllTimeMovies = [];
    return;
  }
  const available = new Set(state.allTimeData.movies.map((movie) => movie.movie_code));
  state.selectedAllTimeMovies = state.selectedAllTimeMovies.filter((code) => available.has(code));
  if (!state.selectedAllTimeMovies.length) {
    state.selectedAllTimeMovies = [state.allTimeData.movies[0].movie_code];
  }
}

function resetLongestSpellSelections() {
  if (!state.longestSpellData?.movies?.length) {
    state.selectedLongestSpellMovies = [];
    return;
  }
  const available = new Set(state.longestSpellData.movies.map((movie) => movie.movie_code));
  state.selectedLongestSpellMovies = state.selectedLongestSpellMovies.filter((code) => available.has(code));
  if (!state.selectedLongestSpellMovies.length) {
    state.selectedLongestSpellMovies = [state.longestSpellData.movies[0].movie_code];
  }
}

function resetHalfLifeSelections() {
  if (!state.halfLifeData?.movies?.length) {
    state.selectedHalfLifeMovies = [];
    return;
  }
  const available = new Set(state.halfLifeData.movies.map((movie) => movie.movie_code));
  state.selectedHalfLifeMovies = state.selectedHalfLifeMovies.filter((code) => available.has(code));
  if (!state.selectedHalfLifeMovies.length) {
    state.selectedHalfLifeMovies = [state.halfLifeData.movies[0].movie_code];
  }
}

function resetSelectionsForData(previousSelection = []) {
  const available = new Set(state.data.movies.map((movie) => movie.movie_code));
  state.selectedMovies = previousSelection.filter((code) => available.has(code));
  if (!state.selectedMovies.length && state.data.movies.length) {
    state.selectedMovies = [state.data.movies[0].movie_code];
  }
}

function toggleSelectedMovie(movieCode) {
  if (isSelected(movieCode)) {
    state.selectedMovies = state.selectedMovies.filter((code) => code !== movieCode);
    if (!state.selectedMovies.length && state.data.movies.length) {
      state.selectedMovies = [state.data.movies[0].movie_code];
    }
  } else {
    state.selectedMovies.push(movieCode);
  }
  movieFilter.property("value", state.selectedMovies[state.selectedMovies.length - 1]);
  renderChart();
  renderSelectedSummary();
  renderMovieChips();
}

function toggleSelectedAllTimeMovie(movieCode) {
  if (isAllTimeSelected(movieCode)) {
    state.selectedAllTimeMovies = state.selectedAllTimeMovies.filter((code) => code !== movieCode);
    if (!state.selectedAllTimeMovies.length && state.allTimeData?.movies?.length) {
      state.selectedAllTimeMovies = [state.allTimeData.movies[0].movie_code];
    }
  } else {
    state.selectedAllTimeMovies.push(movieCode);
  }
  renderAllTimeChart();
  renderAllTimeSummary();
  renderAllTimeChips();
}

function toggleSelectedLongestSpellMovie(movieCode) {
  if (isLongestSpellSelected(movieCode)) {
    state.selectedLongestSpellMovies = state.selectedLongestSpellMovies.filter((code) => code !== movieCode);
    if (!state.selectedLongestSpellMovies.length && state.longestSpellData?.movies?.length) {
      state.selectedLongestSpellMovies = [state.longestSpellData.movies[0].movie_code];
    }
  } else {
    state.selectedLongestSpellMovies.push(movieCode);
  }
  renderLongestSpellChart();
  renderLongestSpellSummary();
  renderLongestSpellChips();
}

function toggleSelectedHalfLifeMovie(movieCode) {
  if (isHalfLifeSelected(movieCode)) {
    state.selectedHalfLifeMovies = state.selectedHalfLifeMovies.filter((code) => code !== movieCode);
    if (!state.selectedHalfLifeMovies.length && state.halfLifeData?.movies?.length) {
      state.selectedHalfLifeMovies = [state.halfLifeData.movies[0].movie_code];
    }
  } else {
    state.selectedHalfLifeMovies.push(movieCode);
  }
  renderHalfLifeChart();
  renderHalfLifeSummary();
  renderHalfLifeChips();
}

function toggleSelectedSearchMovie(movieCode) {
  if (isSearchSelected(movieCode)) {
    state.selectedSearchMovies = state.selectedSearchMovies.filter((code) => code !== movieCode);
  } else if (state.searchMovies.some((movie) => movie.movie_code === movieCode)) {
    state.selectedSearchMovies.push(movieCode);
  }
  renderSearchSection();
}

function removeSearchMovie(movieCode) {
  state.searchMovies = state.searchMovies.filter((movie) => movie.movie_code !== movieCode);
  state.selectedSearchMovies = state.selectedSearchMovies.filter((code) => code !== movieCode);
  renderSearchSection();
}

function renderChart() {
  const movies = visibleMovies();
  const points = flattenPoints(movies);
  const node = svg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 560;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 20, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  if (!points.length) return;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.screen_count) * 1.08])
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.audience_per_screen) * 1.12])
    .nice()
    .range([innerHeight, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));

  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));

  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7));
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat((d) => formatNumber(d)));

  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 46)
    .attr("text-anchor", "middle")
    .text("주간 평균 스크린 수");

  g.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", yAxisTitleOffset)
    .attr("text-anchor", "middle")
    .text("주간 관객수 / 평균 스크린 수");

  const line = d3
    .line()
    .x((d) => x(d.screen_count))
    .y((d) => y(d.audience_per_screen))
    .curve(d3.curveCatmullRom.alpha(0.45));

  const movieGroup = g
    .selectAll(".movie")
    .data(movies, (d) => d.movie_code)
    .join("g")
    .attr("class", "movie")
    .classed("is-active", true)
    .style("--movie-color", (d) => color(d.movie_code))
    .on("mouseenter", (_event, d) => activateMovie(d.movie_code))
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideTooltip();
        clearActiveMovie();
      }
    });

  movieGroup
    .append("path")
    .attr("class", "trajectory")
    .attr("d", (d) => line(moviePoints(d)));

  if (!motionQuery.matches) {
    movieGroup
      .append("path")
      .datum((d) => d)
      .attr("class", "trajectory-motion")
      .style("--movie-color", (d) => color(d.movie_code))
      .attr("d", (d) => line(moviePoints(d)));
  }

  if (!motionQuery.matches) {
    movieGroup.selectAll(".trajectory").each(function () {
      const length = this.getTotalLength();
      const path = d3.select(this)
        .attr("stroke-dasharray", length)
        .attr("stroke-dashoffset", length);
      requestAnimationFrame(() => {
        path
          .transition()
          .duration(950)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      });
    });
  }

  movieGroup
    .append("circle")
    .attr("class", "endpoint start-point")
    .attr("cx", (d) => x(moviePoints(d)[0].screen_count))
    .attr("cy", (d) => y(moviePoints(d)[0].audience_per_screen))
    .attr("r", 8);

  movieGroup
    .append("circle")
    .attr("class", "endpoint latest-point")
    .attr("cx", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count))
    .attr("cy", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen))
    .attr("r", 7);

  movieGroup
    .selectAll(".point")
    .data((d) => moviePoints(d).map((point) => ({ ...point, movie: d })))
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => x(d.screen_count))
    .attr("cy", (d) => y(d.audience_per_screen))
    .attr("r", (d) => (d.date === state.data.latest_data_date ? 6.5 : 5))
    .on("mouseenter", showTooltip)
    .on("click", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) hideTooltip();
    });

  movieGroup
    .append("polygon")
    .datum((d) => d)
    .attr("class", "trajectory-arrow")
    .attr("points", "0,-6 14,0 0,6")
    .attr("transform", (d) => latestArrowTransform(d, x, y))
    .attr("fill", (d) => color(d.movie_code));

  g.append("g")
    .attr("class", "label-layer")
    .selectAll(".latest-label")
    .data(movies, (d) => d.movie_code)
    .join("text")
    .attr("class", "latest-label")
    .attr("x", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count) + 8)
    .attr("y", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen) + 4)
    .text((d) => d.movie_name);

}

function renderAllTimeChart() {
  const movies = selectedAllTimeMovies();
  const points = movies.flatMap((movie) =>
    moviePoints(movie).map((point) => ({
      ...point,
      movie_code: movie.movie_code,
      movie_name: movie.movie_name,
      release_date: movie.release_date,
      release_type: movie.release_type,
      movie,
    })),
  );
  const node = allTimeSvg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 560;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 20, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  allTimeSvg.attr("viewBox", `0 0 ${width} ${height}`);
  allTimeSvg.selectAll("*").remove();
  if (!points.length) return;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.screen_count) * 1.08])
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.audience_per_screen) * 1.12])
    .nice()
    .range([innerHeight, 0]);

  const g = allTimeSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));

  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));

  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7));
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat((d) => formatNumber(d)));

  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 46)
    .attr("text-anchor", "middle")
    .text("주간 평균 스크린 수");

  g.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", yAxisTitleOffset)
    .attr("text-anchor", "middle")
    .text("주간 관객수 / 평균 스크린 수");

  const line = d3
    .line()
    .x((d) => x(d.screen_count))
    .y((d) => y(d.audience_per_screen))
    .curve(d3.curveCatmullRom.alpha(0.45));

  const movieGroup = g
    .selectAll(".movie")
    .data(movies, (d) => d.movie_code)
    .join("g")
    .attr("class", "movie")
    .classed("is-active", true)
    .style("--movie-color", (d) => allTimeColor(d.movie_code))
    .on("mouseenter", (_event, d) => activateMovie(d.movie_code))
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideAllTimeTooltip();
        clearActiveMovie();
      }
    });

  movieGroup
    .append("path")
    .attr("class", "trajectory")
    .attr("d", (d) => line(moviePoints(d)));

  if (!motionQuery.matches) {
    movieGroup
      .append("path")
      .datum((d) => d)
      .attr("class", "trajectory-motion")
      .style("--movie-color", (d) => allTimeColor(d.movie_code))
      .attr("d", (d) => line(moviePoints(d)));
  }

  movieGroup
    .append("circle")
    .attr("class", "endpoint start-point")
    .attr("cx", (d) => x(moviePoints(d)[0].screen_count))
    .attr("cy", (d) => y(moviePoints(d)[0].audience_per_screen))
    .attr("r", 8);

  movieGroup
    .append("circle")
    .attr("class", "endpoint latest-point")
    .attr("cx", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count))
    .attr("cy", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen))
    .attr("r", 7);

  movieGroup
    .selectAll(".point")
    .data((d) => moviePoints(d).map((point) => ({ ...point, movie: d })))
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => x(d.screen_count))
    .attr("cy", (d) => y(d.audience_per_screen))
    .attr("r", (d) => (d.date === d.movie.comparison_end_date ? 6.5 : 5))
    .on("mouseenter", showAllTimeTooltip)
    .on("click", showAllTimeTooltip)
    .on("mousemove", moveAllTimeTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) hideAllTimeTooltip();
    });

  movieGroup
    .append("polygon")
    .datum((d) => ({ ...d, chart_color: allTimeColor(d.movie_code) }))
    .attr("class", "trajectory-arrow")
    .attr("points", "0,-6 14,0 0,6")
    .attr("transform", (d) => latestArrowTransform(d, x, y))
    .attr("fill", (d) => d.chart_color);

  g.append("g")
    .attr("class", "label-layer")
    .selectAll(".latest-label")
    .data(movies, (d) => d.movie_code)
    .join("text")
    .attr("class", "latest-label")
    .attr("x", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count) + 8)
    .attr("y", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen) + 4)
    .text((d) => `${d.all_time_rank}. ${d.movie_name}`);
}

function renderLongestSpellChart() {
  const movies = selectedLongestSpellMovies();
  const points = movies.flatMap((movie) => moviePoints(movie).map((point) => ({ ...point, movie })));
  const node = longestSpellSvg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 560;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 20, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  longestSpellSvg.attr("viewBox", `0 0 ${width} ${height}`);
  longestSpellSvg.selectAll("*").remove();
  if (!points.length) return;

  const x = d3.scaleLinear().domain([0, d3.max(points, (d) => d.screen_count) * 1.08]).nice().range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(points, (d) => d.audience_per_screen) * 1.12]).nice().range([innerHeight, 0]);
  const g = longestSpellSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "grid").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat((d) => formatNumber(d)));
  g.append("text").attr("class", "axis-title").attr("x", innerWidth / 2).attr("y", innerHeight + 46).attr("text-anchor", "middle").text("주간 평균 스크린 수");
  g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", yAxisTitleOffset).attr("text-anchor", "middle").text("주간 관객수 / 평균 스크린 수");

  const line = d3.line().x((d) => x(d.screen_count)).y((d) => y(d.audience_per_screen)).curve(d3.curveCatmullRom.alpha(0.45));
  const movieGroup = g
    .selectAll(".movie")
    .data(movies, (d) => d.movie_code)
    .join("g")
    .attr("class", "movie")
    .classed("is-active", true)
    .style("--movie-color", (d) => longestSpellColor(d.movie_code))
    .on("mouseenter", (_event, d) => activateMovie(d.movie_code))
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideLongestSpellTooltip();
        clearActiveMovie();
      }
    });

  movieGroup.append("path").attr("class", "trajectory").attr("d", (d) => line(moviePoints(d)));
  if (!motionQuery.matches) {
    movieGroup.append("path").datum((d) => d).attr("class", "trajectory-motion").style("--movie-color", (d) => longestSpellColor(d.movie_code)).attr("d", (d) => line(moviePoints(d)));
  }
  movieGroup.append("circle").attr("class", "endpoint start-point").attr("cx", (d) => x(moviePoints(d)[0].screen_count)).attr("cy", (d) => y(moviePoints(d)[0].audience_per_screen)).attr("r", 8);
  movieGroup.append("circle").attr("class", "endpoint latest-point").attr("cx", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count)).attr("cy", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen)).attr("r", 7);
  movieGroup
    .selectAll(".point")
    .data((d) => moviePoints(d).map((point) => ({ ...point, movie: d })))
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => x(d.screen_count))
    .attr("cy", (d) => y(d.audience_per_screen))
    .attr("r", (d) => (d.date === d.movie.comparison_end_date ? 6.5 : 5))
    .on("mouseenter", showLongestSpellTooltip)
    .on("click", showLongestSpellTooltip)
    .on("mousemove", moveLongestSpellTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) hideLongestSpellTooltip();
    });
  movieGroup
    .append("polygon")
    .datum((d) => ({ ...d, chart_color: longestSpellColor(d.movie_code) }))
    .attr("class", "trajectory-arrow")
    .attr("points", "0,-6 14,0 0,6")
    .attr("transform", (d) => latestArrowTransform(d, x, y))
    .attr("fill", (d) => d.chart_color);

  g.append("g")
    .attr("class", "label-layer")
    .selectAll(".latest-label")
    .data(movies, (d) => d.movie_code)
    .join("text")
    .attr("class", "latest-label")
    .attr("x", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count) + 8)
    .attr("y", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen) + 4)
    .text((d) => `${d.spell_length_rank}. ${d.movie_name}`);
}

function renderHalfLifeChart() {
  const movies = selectedHalfLifeMovies();
  const points = movies.flatMap((movie) => moviePoints(movie).map((point) => ({ ...point, movie })));
  const node = halfLifeSvg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 560;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 20, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  halfLifeSvg.attr("viewBox", `0 0 ${width} ${height}`);
  halfLifeSvg.selectAll("*").remove();
  if (!points.length) return;

  const x = d3.scaleLinear().domain([0, d3.max(points, (d) => d.screen_count) * 1.08]).nice().range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(points, (d) => d.audience_per_screen) * 1.12]).nice().range([innerHeight, 0]);
  const g = halfLifeSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "grid").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat((d) => formatNumber(d)));
  g.append("text").attr("class", "axis-title").attr("x", innerWidth / 2).attr("y", innerHeight + 46).attr("text-anchor", "middle").text("주간 평균 스크린 수");
  g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", yAxisTitleOffset).attr("text-anchor", "middle").text("주간 관객수 / 평균 스크린 수");

  const line = d3.line().x((d) => x(d.screen_count)).y((d) => y(d.audience_per_screen)).curve(d3.curveCatmullRom.alpha(0.45));
  const movieGroup = g
    .selectAll(".movie")
    .data(movies, (d) => d.movie_code)
    .join("g")
    .attr("class", "movie")
    .classed("is-active", true)
    .style("--movie-color", (d) => halfLifeColor(d.movie_code))
    .on("mouseenter", (_event, d) => activateMovie(d.movie_code))
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideHalfLifeTooltip();
        clearActiveMovie();
      }
    });

  movieGroup.append("path").attr("class", "trajectory").attr("d", (d) => line(moviePoints(d)));
  if (!motionQuery.matches) {
    movieGroup.append("path").datum((d) => d).attr("class", "trajectory-motion").style("--movie-color", (d) => halfLifeColor(d.movie_code)).attr("d", (d) => line(moviePoints(d)));
  }
  movieGroup.append("circle").attr("class", "endpoint start-point").attr("cx", (d) => x(moviePoints(d)[0].screen_count)).attr("cy", (d) => y(moviePoints(d)[0].audience_per_screen)).attr("r", 8);
  movieGroup.append("circle").attr("class", "endpoint latest-point").attr("cx", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count)).attr("cy", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen)).attr("r", 7);
  movieGroup
    .selectAll(".point")
    .data((d) => moviePoints(d).map((point) => ({ ...point, movie: d })))
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => x(d.screen_count))
    .attr("cy", (d) => y(d.audience_per_screen))
    .attr("r", (d) => (d.date === d.movie.comparison_end_date ? 6.5 : 5))
    .on("mouseenter", showHalfLifeTooltip)
    .on("click", showHalfLifeTooltip)
    .on("mousemove", moveHalfLifeTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) hideHalfLifeTooltip();
    });
  movieGroup
    .append("rect")
    .datum((d) => ({ ...d, chart_color: halfLifeColor(d.movie_code) }))
    .attr("class", "trajectory-arrow trajectory-stop")
    .attr("x", -13)
    .attr("y", -4)
    .attr("width", 26)
    .attr("height", 8)
    .attr("rx", 1)
    .attr("transform", (d) => latestStopTransform(d, x, y))
    .attr("fill", (d) => d.chart_color);

  g.append("g")
    .attr("class", "label-layer")
    .selectAll(".latest-label")
    .data(movies, (d) => d.movie_code)
    .join("text")
    .attr("class", "latest-label")
    .attr("x", (d) => x(moviePoints(d)[moviePoints(d).length - 1].screen_count) + 8)
    .attr("y", (d) => y(moviePoints(d)[moviePoints(d).length - 1].audience_per_screen) + 4)
    .text((d) => `${d.half_life_rank}. ${d.movie_name}`);
}

function renderSearchChart() {
  const movies = selectedSearchMovies();
  const points = movies.flatMap((movie) => searchMoviePoints(movie).map((point) => ({ ...point, movie })));
  const node = searchSvg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 560;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 20, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  searchSvg.attr("viewBox", `0 0 ${width} ${height}`);
  searchSvg.selectAll("*").remove();

  const xMax = points.length ? d3.max(points, (d) => d.screen_count) * 1.08 : 100;
  const yMax = points.length ? d3.max(points, (d) => d.audience_per_screen) * 1.12 : 100;
  const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);
  const g = searchSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "grid").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat((d) => formatNumber(d)));
  g.append("text").attr("class", "axis-title").attr("x", innerWidth / 2).attr("y", innerHeight + 46).attr("text-anchor", "middle").text("주간 평균 스크린 수");
  g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", yAxisTitleOffset).attr("text-anchor", "middle").text("주간 관객수 / 평균 스크린 수");
  if (!points.length) return;

  const line = d3.line().x((d) => x(d.screen_count)).y((d) => y(d.audience_per_screen)).curve(d3.curveCatmullRom.alpha(0.45));
  const movieGroup = g
    .selectAll(".movie")
    .data(movies, (d) => d.movie_code)
    .join("g")
    .attr("class", "movie")
    .classed("is-active", true)
    .style("--movie-color", (d) => searchColor(d.movie_code))
    .on("mouseenter", (_event, d) => activateMovie(d.movie_code))
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideSearchTooltip();
        clearActiveMovie();
      }
    });

  movieGroup.append("path").attr("class", "trajectory").attr("d", (d) => line(searchMoviePoints(d)));
  if (!motionQuery.matches) {
    movieGroup.append("path").datum((d) => d).attr("class", "trajectory-motion").style("--movie-color", (d) => searchColor(d.movie_code)).attr("d", (d) => line(searchMoviePoints(d)));
  }
  movieGroup.append("circle").attr("class", "endpoint start-point").attr("cx", (d) => x(searchMoviePoints(d)[0].screen_count)).attr("cy", (d) => y(searchMoviePoints(d)[0].audience_per_screen)).attr("r", 8);
  movieGroup.append("circle").attr("class", "endpoint latest-point").attr("cx", (d) => x(searchMoviePoints(d)[searchMoviePoints(d).length - 1].screen_count)).attr("cy", (d) => y(searchMoviePoints(d)[searchMoviePoints(d).length - 1].audience_per_screen)).attr("r", 7);
  movieGroup
    .selectAll(".point")
    .data((d) => searchMoviePoints(d).map((point) => ({ ...point, movie: d })))
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => x(d.screen_count))
    .attr("cy", (d) => y(d.audience_per_screen))
    .attr("r", 5)
    .on("mouseenter", showSearchTooltip)
    .on("click", showSearchTooltip)
    .on("mousemove", moveSearchTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) hideSearchTooltip();
    });
  movieGroup
    .append("polygon")
    .datum((d) => ({ ...d, chart_color: searchColor(d.movie_code) }))
    .attr("class", "trajectory-arrow")
    .attr("points", "0,-6 14,0 0,6")
    .attr("transform", (d) => latestSearchArrowTransform(d, x, y))
    .attr("fill", (d) => d.chart_color);

  g.append("g")
    .attr("class", "label-layer")
    .selectAll(".latest-label")
    .data(movies, (d) => d.movie_code)
    .join("text")
    .attr("class", "latest-label")
    .attr("x", (d) => x(searchMoviePoints(d)[searchMoviePoints(d).length - 1].screen_count) + 8)
    .attr("y", (d) => y(searchMoviePoints(d)[searchMoviePoints(d).length - 1].audience_per_screen) + 4)
    .text((d) => d.movie_name);
}

function showTooltip(event, d) {
  activateMovie(d.movie.movie_code);
  tooltip.hidden = false;
  tooltip
    .html(
      `<strong>${d.movie.movie_name}</strong>
      ${pointRole(d, d.movie)} 지점 · ${d.week_start_date} ~ ${d.week_end_date}<br>
      ${isRerelease(d.movie) ? "재개봉 상영 중<br>" : ""}${releaseLabel(d.movie)} ${d.movie.release_date}<br>
      ${d.week_number}주차 · ${isRerelease(d.movie) ? "재개봉" : "개봉"} ${d.days_since_release}일차 · 관측 ${d.observed_days}일<br>
      순위 ${d.rank ?? "-"}위<br>
      주간 관객 ${formatNumber(d.weekly_audience_count)}<br>
      누적 관객 ${formatNumber(d.audience_accumulated ?? 0)}<br>
      집계 관객 ${formatNumber(d.audience_count)} · 평균 스크린 ${formatRatio(d.screen_count)}<br>
      스크린당 관객수 ${formatRatio(d.audience_per_screen)}`,
    )
    .attr("hidden", null);
  moveTooltip(event);
}

function moveTooltip(event) {
  const panel = document.querySelector(".chart-panel").getBoundingClientRect();
  tooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideTooltip() {
  tooltip.attr("hidden", true);
}

function showAllTimeTooltip(event, d) {
  activateMovie(d.movie.movie_code);
  allTimeTooltip.hidden = false;
  allTimeTooltip
    .html(
      `<strong>${d.movie.all_time_rank}위 · ${d.movie.movie_name}</strong>
      ${pointRole(d, d.movie)} 지점 · ${d.week_start_date} ~ ${d.week_end_date}<br>
      연속 관측 기간 ${d.movie.comparison_start_date} ~ ${d.movie.comparison_end_date}<br>
      ${d.week_number}주차 · 비교 ${d.days_since_release}일차 · 관측 ${d.observed_days}일<br>
      순위 ${d.rank ?? "-"}위<br>
      주간 관객 ${formatNumber(d.weekly_audience_count)}<br>
      누적 관객 ${formatNumber(d.audience_accumulated ?? 0)}<br>
      기준 누적 관객 ${formatNumber(d.movie.audience_accumulated_as_of_date ?? 0)}<br>
      집계 관객 ${formatNumber(d.audience_count)} · 평균 스크린 ${formatRatio(d.screen_count)}<br>
      스크린당 관객수 ${formatRatio(d.audience_per_screen)}`,
    )
    .attr("hidden", null);
  moveAllTimeTooltip(event);
}

function moveAllTimeTooltip(event) {
  const panel = document.querySelector(".all-time-panel").getBoundingClientRect();
  allTimeTooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideAllTimeTooltip() {
  allTimeTooltip.attr("hidden", true);
}

function showLongestSpellTooltip(event, d) {
  activateMovie(d.movie.movie_code);
  const weeklyAverageAudience = firstSpellWeeklyAverageAudience(d.movie);
  const weeklyAudiencePerAverageScreen = firstSpellWeeklyAudiencePerAverageScreen(d.movie);
  longestSpellTooltip.hidden = false;
  longestSpellTooltip
    .html(
      `<strong>${d.movie.spell_length_rank}위 · ${d.movie.movie_name}</strong>
      ${pointRole(d, d.movie)} 지점 · ${d.week_start_date} ~ ${d.week_end_date}<br>
      연속 관측 기간 ${d.movie.comparison_start_date} ~ ${d.movie.comparison_end_date}<br>
      ${d.week_number}주차 · 비교 ${d.days_since_release}일차 · 관측 ${d.observed_days}일<br>
      순위 ${d.rank ?? "-"}위<br>
      주간 관객 ${formatNumber(d.weekly_audience_count)}<br>
      누적 관객 ${formatNumber(d.audience_accumulated ?? 0)}<br>
      첫 spell 관객 ${formatNumber(d.movie.first_spell_audience_accumulated ?? 0)}<br>
      주별 평균 관객 ${weeklyAverageAudience === null ? "-" : formatNumber(weeklyAverageAudience)}<br>
      주별 평균 관객 / 주별 평균 스크린 ${weeklyAudiencePerAverageScreen === null ? "-" : formatDecimal(weeklyAudiencePerAverageScreen)}<br>
      집계 관객 ${formatNumber(d.audience_count)} · 평균 스크린 ${formatRatio(d.screen_count)}<br>
      스크린당 관객수 ${formatRatio(d.audience_per_screen)}`,
    )
    .attr("hidden", null);
  moveLongestSpellTooltip(event);
}

function moveLongestSpellTooltip(event) {
  const panel = document.querySelector(".longest-spell-panel").getBoundingClientRect();
  longestSpellTooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideLongestSpellTooltip() {
  longestSpellTooltip.attr("hidden", true);
}

function showHalfLifeTooltip(event, d) {
  activateMovie(d.movie.movie_code);
  halfLifeTooltip.hidden = false;
  halfLifeTooltip
    .html(
      `<strong>${d.movie.half_life_rank}위 · ${d.movie.movie_name}</strong>
      ${pointRole(d, d.movie, "반감기")} 지점 · ${d.week_start_date} ~ ${d.week_end_date}<br>
      연속 관측 기간 ${d.movie.comparison_start_date} ~ ${d.movie.comparison_end_date}<br>
      반감기 ${d.movie.half_life_week_number}주차 · ${d.movie.half_life_days}일<br>
      1주차 스크린당 관객 ${formatDecimal(d.movie.first_week_audience_per_screen)}<br>
      반감 기준 ${formatDecimal(d.movie.half_threshold_audience_per_screen)} · 반감기 주차 ${formatDecimal(d.movie.half_life_week_audience_per_screen)}<br>
      ${d.week_number}주차 · 비교 ${d.days_since_release}일차 · 관측 ${d.observed_days}일<br>
      순위 ${d.rank ?? "-"}위<br>
      주간 관객 ${formatNumber(d.weekly_audience_count)}<br>
      누적 관객 ${formatNumber(d.audience_accumulated ?? 0)}<br>
      집계 관객 ${formatNumber(d.audience_count)} · 평균 스크린 ${formatRatio(d.screen_count)}<br>
      스크린당 관객수 ${formatRatio(d.audience_per_screen)}`,
    )
    .attr("hidden", null);
  moveHalfLifeTooltip(event);
}

function moveHalfLifeTooltip(event) {
  const panel = document.querySelector(".half-life-panel").getBoundingClientRect();
  halfLifeTooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideHalfLifeTooltip() {
  halfLifeTooltip.attr("hidden", true);
}

function showSearchTooltip(event, d) {
  activateMovie(d.movie.movie_code);
  searchTooltip.hidden = false;
  searchTooltip
    .html(
      `<strong>${d.movie.movie_name}</strong>
      ${pointRole(d, { ...d.movie, points: d.movie.weekly_points })} 지점 · ${d.week_start_date} ~ ${d.week_end_date}<br>
      관측 기간 ${d.movie.first_observed_date} ~ ${d.movie.latest_observed_date}<br>
      ${d.week_number}주차 · ${d.days_since_release}일차 · 관측 ${d.observed_days}일<br>
      순위 ${d.rank ?? "-"}위<br>
      주간 관객 ${formatNumber(d.weekly_audience_count)}<br>
      누적 관객 ${formatNumber(d.audience_accumulated ?? 0)}<br>
      집계 관객 ${formatNumber(d.audience_count)} · 평균 스크린 ${formatRatio(d.screen_count)}<br>
      주간 관객수 / 평균 스크린 수 ${formatRatio(d.audience_per_screen)}`,
    )
    .attr("hidden", null);
  moveSearchTooltip(event);
}

function moveSearchTooltip(event) {
  const panel = document.querySelector(".search-trajectory-panel").getBoundingClientRect();
  searchTooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideSearchTooltip() {
  searchTooltip.attr("hidden", true);
}

function showConcentrationTooltip(event, d) {
  activateMovie(d.movie_code);
  concentrationTooltip.hidden = false;
  concentrationTooltip
    .html(
      `<strong>${d.movie_name}</strong>
      최근 7일 관객 ${formatNumber(d.audience_count)}<br>
      관객 점유율 ${formatDecimal(d.audience_share)}% · 스크린 점유율 ${formatDecimal(d.screen_share)}%<br>
      스크린 ${formatDecimal(d.screen_count)} · 순위 ${d.rank ?? "-"}위`,
    )
    .attr("hidden", null);
  moveConcentrationTooltip(event);
}

function moveConcentrationTooltip(event) {
  const panel = document.querySelector(".concentration-panel").getBoundingClientRect();
  concentrationTooltip
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`);
}

function hideConcentrationTooltip() {
  concentrationTooltip.attr("hidden", true);
}

function renderConcentrationChart() {
  const data = concentrationData();
  const points = data?.points ?? [];
  const node = concentrationSvg.node();
  const width = node.clientWidth || 960;
  const height = node.clientHeight || 420;
  const mobile = isMobileLayout();
  const margin = mobile ? { top: 22, right: 18, bottom: 54, left: 58 } : { top: 26, right: 34, bottom: 58, left: 74 };
  const yAxisTitleOffset = mobile ? -42 : -52;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  concentrationSvg.attr("viewBox", `0 0 ${width} ${height}`);
  concentrationSvg.selectAll("*").remove();
  if (!points.length) return;

  const x = d3
    .scaleLinear()
    .domain([0, Math.max(10, d3.max(points, (d) => d.screen_share) * 1.18)])
    .nice()
    .range([0, innerWidth]);
  const y = d3
    .scaleLinear()
    .domain([0, Math.max(10, d3.max(points, (d) => d.audience_share) * 1.18)])
    .nice()
    .range([innerHeight, 0]);
  const radius = d3
    .scaleSqrt()
    .domain([0, d3.max(points, (d) => d.audience_count)])
    .range(mobile ? [16, 42] : [20, 60]);
  const bubbles = points.map((point) => ({
    ...point,
    targetX: x(point.screen_share),
    targetY: y(point.audience_share),
    radius: radius(point.audience_count),
  }));

  d3.forceSimulation(bubbles)
    .force("x", d3.forceX((d) => d.targetX).strength(0.22))
    .force("y", d3.forceY((d) => d.targetY).strength(0.22))
    .force("collide", d3.forceCollide((d) => d.radius + 4).strength(1).iterations(4))
    .stop()
    .tick(180);

  for (const bubble of bubbles) {
    bubble.x = Math.max(bubble.radius, Math.min(innerWidth - bubble.radius, bubble.x));
    bubble.y = Math.max(bubble.radius, Math.min(innerHeight - bubble.radius, bubble.y));
  }

  const g = concentrationSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const parityMax = Math.min(x.domain()[1], y.domain()[1]);
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(7).tickSize(-innerWidth).tickFormat(""));
  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));
  g.append("line")
    .attr("class", "concentration-parity-line")
    .attr("x1", x(0))
    .attr("y1", y(0))
    .attr("x2", x(parityMax))
    .attr("y2", y(parityMax));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(7).tickFormat((d) => `${d}%`));
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat((d) => `${d}%`));
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 46)
    .attr("text-anchor", "middle")
    .text("전체 스크린 대비 비율");
  g.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", yAxisTitleOffset)
    .attr("text-anchor", "middle")
    .text("전체 관객수 대비 비율");

  g.append("g")
    .selectAll(".concentration-anchor-line")
    .data(bubbles, (d) => d.movie_code)
    .join("line")
    .attr("class", "concentration-anchor-line")
    .attr("x1", (d) => d.targetX)
    .attr("y1", (d) => d.targetY)
    .attr("x2", (d) => d.x)
    .attr("y2", (d) => d.y);

  g.append("g")
    .selectAll(".concentration-anchor")
    .data(bubbles, (d) => d.movie_code)
    .join("circle")
    .attr("class", "concentration-anchor")
    .attr("cx", (d) => d.targetX)
    .attr("cy", (d) => d.targetY)
    .attr("r", 2.5);

  const bubble = g
    .append("g")
    .selectAll(".concentration-bubble")
    .data(bubbles, (d) => d.movie_code)
    .join("g")
    .attr("class", "concentration-bubble")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .style("--movie-color", (d) => color(d.movie_code))
    .on("mouseenter", showConcentrationTooltip)
    .on("mousemove", moveConcentrationTooltip)
    .on("mouseleave", () => {
      if (!isMobileLayout()) {
        hideConcentrationTooltip();
        clearActiveMovie();
      }
    });

  bubble
    .append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => color(d.movie_code));
  bubble
    .append("text")
    .attr("class", "bubble-rank")
    .attr("dy", "-0.25em")
    .text((d) => d.rank ?? "");
  bubble
    .append("text")
    .attr("class", "bubble-title")
    .attr("dy", "1.05em")
    .text((d) => shortMovieName(d.movie_name));
}

function renderMovieList() {
  const cards = d3
    .select("#movieList")
    .selectAll(".movie-card")
    .data(state.data.movies, (d) => d.movie_code)
    .join("article")
    .attr("class", "movie-card");

  cards.html(
    (d) => {
      return `<h2><span class="swatch" style="background:${color(d.movie_code)}"></span>${d.movie_name}</h2>
      <dl>${renderMetricRows(d)}</dl>`;
    },
  );
}

function renderSelectedSummary() {
  const movies = selectedMovies();
  const container = d3.select("#selectedSummary");
  if (!movies.length) {
    container.html("");
    return;
  }
  const cards = movies
    .map((movie) => {
      const latest = latestTrajectoryPoint(movie);
      return `<article class="summary-card" style="--movie-color:${color(movie.movie_code)}">
        <div class="summary-title">
          <span class="swatch"></span>
          <h2>${movie.movie_name}</h2>
        </div>
        <dl>
          <div><dt>상태</dt><dd>${statusLabel(movie, latest)}</dd></div>
          <div><dt>${releaseLabel(movie)}</dt><dd>${movie.release_date}</dd></div>
          <div><dt>최신 순위</dt><dd>${movie.latest_rank ?? "-"}위</dd></div>
          ${renderMetricRows(movie)}
        </dl>
      </article>`;
    })
    .join("");
  container.html(cards);
}

function renderAllTimeSummary() {
  const movies = selectedAllTimeMovies();
  const container = d3.select("#allTimeSummary");
  if (!movies.length) {
    container.html("");
    return;
  }
  const cards = movies
    .map((movie) => {
      const latest = latestTrajectoryPoint(movie);
      const finalWeek = latest?.week_number ?? latestWeeklyPoint(movie)?.week_number ?? "-";
      return `<article class="summary-card" style="--movie-color:${allTimeColor(movie.movie_code)}">
        <div class="summary-title">
          <span class="swatch"></span>
          <h2>${movie.all_time_rank}위 · ${movie.movie_name}</h2>
        </div>
        <dl>
          <div><dt>총 관객</dt><dd>${formatNumber(movie.audience_accumulated_as_of_date ?? movie.latest_audience_accumulated ?? 0)}</dd></div>
          <div><dt>연속 관측 기간</dt><dd>${movie.comparison_start_date} ~ ${movie.comparison_end_date}</dd></div>
          <div><dt>비교 주차</dt><dd>${finalWeek}주차</dd></div>
        </dl>
      </article>`;
    })
    .join("");
  container.html(cards);
}

function renderLongestSpellSummary() {
  const movies = selectedLongestSpellMovies();
  const container = d3.select("#longestSpellSummary");
  if (!movies.length) {
    container.html("");
    return;
  }
  const cards = movies
    .map((movie) => {
      const weeklyAverageAudience = firstSpellWeeklyAverageAudience(movie);
      const weeklyAudiencePerAverageScreen = firstSpellWeeklyAudiencePerAverageScreen(movie);
      return `<article class="summary-card" style="--movie-color:${longestSpellColor(movie.movie_code)}">
        <div class="summary-title">
          <span class="swatch"></span>
          <h2>${movie.spell_length_rank}위 · ${movie.movie_name}</h2>
        </div>
        <dl>
          <div><dt>첫 spell 관객</dt><dd>${formatNumber(movie.first_spell_audience_accumulated ?? movie.latest_audience_accumulated ?? 0)}</dd></div>
          <div><dt>주별 평균 관객</dt><dd>${weeklyAverageAudience === null ? "-" : formatNumber(weeklyAverageAudience)}</dd></div>
          <div><dt>주별 평균 관객 / 주별 평균 스크린</dt><dd>${weeklyAudiencePerAverageScreen === null ? "-" : formatDecimal(weeklyAudiencePerAverageScreen)}</dd></div>
          <div><dt>연속 관측 기간</dt><dd>${movie.comparison_start_date} ~ ${movie.comparison_end_date}</dd></div>
          <div><dt>관측일</dt><dd>${formatNumber(movie.comparison_observed_days ?? 0)}일</dd></div>
          <div><dt>비교 주차</dt><dd>${movie.comparison_week_count ?? latestWeeklyPoint(movie)?.week_number ?? "-"}주차</dd></div>
        </dl>
      </article>`;
    })
    .join("");
  container.html(cards);
}

function renderHalfLifeSummary() {
  const movies = selectedHalfLifeMovies();
  const container = d3.select("#halfLifeSummary");
  if (!movies.length) {
    container.html("");
    return;
  }
  const cards = movies
    .map((movie) => {
      return `<article class="summary-card" style="--movie-color:${halfLifeColor(movie.movie_code)}">
        <div class="summary-title">
          <span class="swatch"></span>
          <h2>${movie.half_life_rank}위 · ${movie.movie_name}</h2>
        </div>
        <dl>
          <div><dt>반감기</dt><dd>${movie.half_life_week_number}주차 · ${formatNumber(movie.half_life_days)}일</dd></div>
          <div><dt>1주차 스크린당 관객</dt><dd>${formatDecimal(movie.first_week_audience_per_screen)}</dd></div>
          <div><dt>반감 기준</dt><dd>${formatDecimal(movie.half_threshold_audience_per_screen)}</dd></div>
          <div><dt>반감기 주차 스크린당 관객</dt><dd>${formatDecimal(movie.half_life_week_audience_per_screen)}</dd></div>
          <div><dt>연속 관측 기간</dt><dd>${movie.comparison_start_date} ~ ${movie.comparison_end_date}</dd></div>
        </dl>
      </article>`;
    })
    .join("");
  container.html(cards);
}

function renderSearchSummary() {
  const movies = selectedSearchMovies();
  const container = d3.select("#searchSummary");
  if (!movies.length) {
    container.html("");
    return;
  }
  const cards = movies
    .map((movie) => {
      const incompleteLabel = incompleteOriginalReleaseLabel(movie);
      const finalWeek = searchMoviePoints(movie)[searchMoviePoints(movie).length - 1]?.week_number ?? "-";
      return `<article class="summary-card" style="--movie-color:${searchColor(movie.movie_code)}">
        <div class="summary-title">
          <span class="swatch"></span>
          <h2>${movie.movie_name}</h2>
        </div>
        <dl>
          <div><dt>영화코드</dt><dd>${movie.movie_code}</dd></div>
          <div><dt>비교 기준</dt><dd>원개봉일 기준 첫 번째 연속 관측 spell</dd></div>
          <div><dt>관측 기간</dt><dd>${movie.first_observed_date} ~ ${movie.latest_observed_date}</dd></div>
          <div><dt>상영 주차</dt><dd>${finalWeek}주차</dd></div>
          <div><dt>최종 누적 관객</dt><dd>${formatNumber(movie.latest_audience_accumulated ?? 0)}</dd></div>
          ${incompleteLabel ? `<div><dt>자료 범위</dt><dd>${incompleteLabel}</dd></div>` : ""}
        </dl>
      </article>`;
    })
    .join("");
  container.html(cards);
}

function renderMovieChips() {
  const chips = d3
    .select("#movieChips")
    .selectAll("button")
    .data(state.data.movies, (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", (d) => `movie-chip${isSelected(d.movie_code) ? " is-selected" : ""}`)
    .attr("aria-pressed", (d) => (isSelected(d.movie_code) ? "true" : "false"))
    .style("--movie-color", (d) => color(d.movie_code))
    .on("click", (_event, d) => toggleSelectedMovie(d.movie_code));

  chips.html(
    (d) => `<span>${d.latest_rank ?? "-"}위</span>
      <strong>${d.movie_name}</strong>
      <small>${latestTrajectoryPoint(d)?.week_number ?? "-"}주차 · ${formatRatio(d.latest_audience_per_screen)}</small>`,
  );
}

function renderAllTimeChips() {
  const chips = d3
    .select("#allTimeChips")
    .selectAll("button")
    .data(state.allTimeData?.movies ?? [], (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", (d) => `movie-chip${isAllTimeSelected(d.movie_code) ? " is-selected" : ""}`)
    .attr("aria-pressed", (d) => (isAllTimeSelected(d.movie_code) ? "true" : "false"))
    .style("--movie-color", (d) => allTimeColor(d.movie_code))
    .on("click", (_event, d) => toggleSelectedAllTimeMovie(d.movie_code));

  chips.html(
    (d) => `<span>${d.all_time_rank}위</span>
      <strong>${d.movie_name}</strong>
      <small>${formatNumber(d.audience_accumulated_as_of_date ?? 0)}명</small>`,
  );
}

function renderLongestSpellChips() {
  const chips = d3
    .select("#longestSpellChips")
    .selectAll("button")
    .data(state.longestSpellData?.movies ?? [], (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", (d) => `movie-chip${isLongestSpellSelected(d.movie_code) ? " is-selected" : ""}`)
    .attr("aria-pressed", (d) => (isLongestSpellSelected(d.movie_code) ? "true" : "false"))
    .style("--movie-color", (d) => longestSpellColor(d.movie_code))
    .on("click", (_event, d) => toggleSelectedLongestSpellMovie(d.movie_code));

  chips.html(
    (d) => `<span>${d.spell_length_rank}위</span>
      <strong>${d.movie_name}</strong>
      <small>${formatNumber(d.comparison_observed_days ?? 0)}일 · ${d.comparison_week_count ?? "-"}주차</small>`,
  );
}

function renderHalfLifeChips() {
  const chips = d3
    .select("#halfLifeChips")
    .selectAll("button")
    .data(state.halfLifeData?.movies ?? [], (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", (d) => `movie-chip${isHalfLifeSelected(d.movie_code) ? " is-selected" : ""}`)
    .attr("aria-pressed", (d) => (isHalfLifeSelected(d.movie_code) ? "true" : "false"))
    .style("--movie-color", (d) => halfLifeColor(d.movie_code))
    .on("click", (_event, d) => toggleSelectedHalfLifeMovie(d.movie_code));

  chips.html(
    (d) => `<span>${d.half_life_rank}위</span>
      <strong>${d.movie_name}</strong>
      <small>${d.half_life_week_number}주차 · ${formatDecimal(d.half_life_week_audience_per_screen)}</small>`,
  );
}

function renderSearchChips() {
  const chips = d3
    .select("#searchChips")
    .selectAll("button.movie-chip")
    .data(state.searchMovies, (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", (d) => `movie-chip${isSearchSelected(d.movie_code) ? " is-selected" : ""}`)
    .attr("aria-pressed", (d) => (isSearchSelected(d.movie_code) ? "true" : "false"))
    .style("--movie-color", (d) => searchColor(d.movie_code))
    .on("click", (_event, d) => toggleSelectedSearchMovie(d.movie_code));

  chips.html(
    (d) => `<span>${d.movie_code}</span>
      <span class="remove-chip" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7"></path>
        </svg>
      </span>
      <strong>${d.movie_name}</strong>
      <small>${d.first_observed_date} ~ ${d.latest_observed_date}</small>`,
  );
  chips.select(".remove-chip").on("click", (event, d) => {
    event.stopPropagation();
    removeSearchMovie(d.movie_code);
  });
}

function renderMovieSearchResults() {
  const container = d3.select("#movieSearchResults");
  container.selectAll(".search-message").data([state.movieSearchMessage]).join("div").attr("class", "search-message").text((d) => d);
  const results = container
    .selectAll("button.search-result")
    .data(state.movieSearchResults, (d) => d.movie_code)
    .join("button")
    .attr("type", "button")
    .attr("class", "search-result")
    .on("click", (_event, d) => addSearchMovie(d));

  results.html(
    (d) => {
      const incompleteLabel = incompleteOriginalReleaseLabel(d);
      return `<strong>${d.movie_name}</strong>
      <small>${d.original_release_date ?? d.first_observed_date ?? "-"} · ${formatNumber(d.audience_accumulated ?? 0)}명 · ${d.movie_code}${incompleteLabel ? ` · ${incompleteLabel}` : ""}</small>`;
    },
  );
}

function renderAllTimeSection() {
  updateColorDomain();
  resetAllTimeSelections();
  hideAllTimeTooltip();
  renderAllTimeChart();
  renderAllTimeSummary();
  renderAllTimeChips();
}

function renderLongestSpellSection() {
  updateColorDomain();
  resetLongestSpellSelections();
  hideLongestSpellTooltip();
  renderLongestSpellChart();
  renderLongestSpellSummary();
  renderLongestSpellChips();
}

function renderHalfLifeSection() {
  updateColorDomain();
  resetHalfLifeSelections();
  hideHalfLifeTooltip();
  renderHalfLifeChart();
  renderHalfLifeSummary();
  renderHalfLifeChips();
}

function renderSearchSection() {
  updateColorDomain();
  hideSearchTooltip();
  renderSearchChart();
  renderSearchSummary();
  renderSearchChips();
}

function updateMovieSearchResults(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!state.movieSearchIndex) {
    state.movieSearchResults = [];
    state.movieSearchMessage = "검색 인덱스를 불러오는 중입니다.";
    renderMovieSearchResults();
    return;
  }
  if (!normalizedQuery.length) {
    state.movieSearchResults = [];
    state.movieSearchMessage = "영화명을 입력하면 후보가 표시됩니다.";
    renderMovieSearchResults();
    return;
  }
  state.movieSearchResults = state.movieSearchIndex.movies
    .filter((movie) => normalizeSearchText(movie.movie_name).includes(normalizedQuery) || normalizeSearchText(movie.movie_code).includes(normalizedQuery))
    .sort((a, b) => {
      const aName = normalizeSearchText(a.movie_name);
      const bName = normalizeSearchText(b.movie_name);
      const aStarts = aName.startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = bName.startsWith(normalizedQuery) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return (b.audience_accumulated ?? 0) - (a.audience_accumulated ?? 0);
    })
    .slice(0, 12);
  state.movieSearchMessage = state.movieSearchResults.length
    ? `${formatNumber(state.movieSearchResults.length)}개 후보`
    : "일치하는 영화가 없습니다.";
  renderMovieSearchResults();
}

function loadSearchShard(shard) {
  if (state.searchShardCache.has(shard)) {
    return Promise.resolve(state.searchShardCache.get(shard));
  }
  return d3.json(dataUrl(`data/movie_search/shards/${shard}.json`)).then((data) => {
    state.searchShardCache.set(shard, data);
    return data;
  });
}

function searchIndexMovie(movieCode) {
  return state.movieSearchIndex?.movies?.find((movie) => movie.movie_code === movieCode) ?? null;
}

function loadSearchTrajectoryMovie(movieCode) {
  const indexMovie = searchIndexMovie(movieCode);
  if (!indexMovie) return Promise.resolve(null);
  return loadSearchShard(indexMovie.shard).then((data) => data.movies.find((movie) => movie.movie_code === movieCode) ?? null);
}

function weeklyPointsUntil(points, cutoffDate) {
  const weeklyPoints = points ?? [];
  if (!cutoffDate) return weeklyPoints;
  return weeklyPoints.filter((point) => point.date <= cutoffDate);
}

function applySearchTrajectory(movie, searchMovie, cutoffDate = null) {
  const weeklyPoints = weeklyPointsUntil(searchMovie?.weekly_points, cutoffDate);
  if (!weeklyPoints.length) return false;
  const latest = weeklyPoints[weeklyPoints.length - 1];
  movie.weekly_points = weeklyPoints;
  movie.points = weeklyPoints;
  movie.search_trajectory_source = "movie_search";
  movie.first_observed_date = searchMovie.first_observed_date;
  movie.latest_observed_date = cutoffDate ?? searchMovie.latest_observed_date;
  movie.comparison_start_date = searchMovie.comparison_start_date;
  movie.comparison_end_date = cutoffDate ?? searchMovie.comparison_end_date;
  movie.comparison_basis = searchMovie.comparison_basis;
  movie.latest_rank = latest.rank;
  movie.latest_audience_count = latest.audience_count;
  movie.latest_audience_accumulated = latest.audience_accumulated;
  movie.latest_screen_count = latest.screen_count;
  movie.latest_audience_per_screen = latest.audience_per_screen;
  return true;
}

function applySearchTrajectories(movies, options = {}) {
  if (!state.movieSearchIndex || !movies?.length) return Promise.resolve(false);
  return Promise.all(
    movies.map((movie) =>
      loadSearchTrajectoryMovie(movie.movie_code).then((searchMovie) => applySearchTrajectory(movie, searchMovie, options.cutoffDate)),
    ),
  ).then((results) => results.some(Boolean));
}

function refreshSearchBackedTrajectories() {
  const tasks = [];
  if (state.allTimeData?.movies?.length) {
    tasks.push(applySearchTrajectories(state.allTimeData.movies));
  }
  if (state.longestSpellData?.movies?.length) {
    tasks.push(applySearchTrajectories(state.longestSpellData.movies));
  }
  return Promise.all(tasks).then(() => updateColorDomain());
}

function renderSearchBackedSections() {
  if (state.allTimeData) {
    hideAllTimeTooltip();
    renderAllTimeChart();
    renderAllTimeSummary();
    renderAllTimeChips();
  }
  if (state.longestSpellData) {
    hideLongestSpellTooltip();
    renderLongestSpellChart();
    renderLongestSpellSummary();
    renderLongestSpellChips();
  }
}

function addSearchMovie(indexMovie) {
  loadSearchShard(indexMovie.shard).then((data) => {
    const movie = data.movies.find((candidate) => candidate.movie_code === indexMovie.movie_code);
    if (!movie) return;
    if (!state.searchMovies.some((candidate) => candidate.movie_code === movie.movie_code)) {
      state.searchMovies.push(movie);
    }
    if (!state.selectedSearchMovies.includes(movie.movie_code)) {
      state.selectedSearchMovies.push(movie.movie_code);
    }
    renderSearchSection();
  });
}

function initializeControls() {
  menuToggle.on("click", () => {
    setMobileMenu(menuToggle.attr("aria-expanded") !== "true");
  });

  movieFilter.on("change", (event) => {
    addSelectedMovie(event.target.value);
  });

  movieSearchInput.on("input", (event) => {
    updateMovieSearchResults(event.target.value);
  });

}

function renderAll() {
  updateColorDomain();
  movieFilter.selectAll("option.movie-option").remove();
  movieFilter
    .selectAll("option.movie-option")
    .data(state.data.movies)
    .join("option")
    .attr("class", "movie-option")
    .attr("value", (d) => d.movie_code)
    .text((d) => d.movie_name);
  movieFilter.property("value", state.selectedMovies[state.selectedMovies.length - 1]);
  hideTooltip();
  hideConcentrationTooltip();
  hideAllTimeTooltip();
  hideLongestSpellTooltip();
  hideHalfLifeTooltip();
  hideSearchTooltip();
  renderChart();
  renderConcentrationChart();
  renderAllTimeChart();
  renderLongestSpellChart();
  renderHalfLifeChart();
  renderSearchChart();
  renderSelectedSummary();
  renderMovieChips();
  renderMovieList();
}

function loadSnapshot(date, previousSelection = state.selectedMovies) {
  return d3.json(dataUrl(`data/snapshots/${date}.json`)).then((data) => {
    data.movies = data.movies.slice(0, data.selection?.max_movies ?? data.movies.length);
    state.data = data;
    resetSelectionsForData(previousSelection);
    renderAll();
  });
}

d3.json(dataUrl("data/snapshots/index.json")).then((index) => {
  const dates = index.dates ?? [];
  dateFilter
    .selectAll("option")
    .data(dates.slice().reverse())
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);

  dateFilter.on("change", (event) => {
    loadSnapshot(event.target.value);
  });

  const initialDate = index.latest ?? dates[dates.length - 1];
  dateFilter.property("value", initialDate);
  return loadSnapshot(initialDate, []);
}).catch(() => d3.json(dataUrl("data/current_movies.json")).then((data) => {
  data.movies = data.movies.slice(0, data.selection?.max_movies ?? data.movies.length);
  state.data = data;
  resetSelectionsForData([]);
  dateFilter.append("option").attr("value", data.latest_data_date).text(data.latest_data_date);
  dateFilter.property("value", data.latest_data_date);
  renderAll();
}));

d3.json(dataUrl("data/all_time_top_movies.json"))
  .then((data) => {
    state.allTimeData = data;
    renderAllTimeSection();
    if (state.movieSearchIndex) {
      applySearchTrajectories(state.allTimeData.movies).then(() => renderAllTimeSection());
    }
  })
  .catch(() => {
    state.allTimeData = null;
  });

d3.json(dataUrl("data/first_spell_longest_movies.json"))
  .then((data) => {
    state.longestSpellData = data;
    renderLongestSpellSection();
    if (state.movieSearchIndex) {
      applySearchTrajectories(state.longestSpellData.movies).then(() => renderLongestSpellSection());
    }
  })
  .catch(() => {
    state.longestSpellData = null;
  });

d3.json(dataUrl("data/first_week_screen_half_life_movies.json"))
  .then((data) => {
    state.halfLifeData = data;
    renderHalfLifeSection();
  })
  .catch(() => {
    state.halfLifeData = null;
  });

d3.json(dataUrl("data/movie_search_index.json"))
  .then((data) => {
    state.movieSearchIndex = data;
    updateMovieSearchResults(movieSearchInput.property("value"));
    return refreshSearchBackedTrajectories().then(renderSearchBackedSections);
  })
  .catch(() => {
    state.movieSearchIndex = null;
  });

initializeControls();
window.addEventListener("resize", () => {
  renderChart();
  renderConcentrationChart();
  renderAllTimeChart();
  renderLongestSpellChart();
  renderHalfLifeChart();
  renderSearchChart();
});
