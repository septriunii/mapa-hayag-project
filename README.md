# MAPA-Hayag Project

**MAPA-Hayag** is an open-source interactive geographic mapping platform designed to explore and visualize the Philippines' administrative boundaries and geographic information.

The name combines two words: **Mapa**, meaning *map*, and **Hayag**, a word used in Visayan languages such as Cebuano, meaning *clear, visible, or revealed*. It also plays on the Tagalog word **mapahayag**, meaning *to express, communicate, or make something known*. Together, these meanings reflect the project's vision of revealing, communicating, and making Philippine geographic information more accessible and understandable to everyone.

🌐 **Live Demo:** [Explore MAPA-Hayag](https://mapahayag-ph.vercel.app/#/) 

## Project Vision

With continuous improvements in geographic accuracy, data integration, performance, and interactive features, **MAPA-Hayag** aims to evolve beyond a simple map viewer into a versatile Philippine geographic information platform.

The project is envisioned as a reusable foundation for various applications, including:

- **Geographic Exploration** — Explore regions, provinces, cities, municipalities, and eventually barangays.
- **Data Visualization** — Present population, demographics, economic indicators, and other geographic statistics.
- **Disaster Risk Management** — Visualize flood-prone areas, hazard zones, evacuation centers, and disaster-related information.
- **Infrastructure Mapping** — Locate schools, hospitals, roads, public facilities, and government services.
- **Research and Education** — Support geographic studies, academic research, and interactive learning.
- **Government and Public Information** — Make administrative and community-level information easier to explore.
- **Custom Applications** — Enable developers to build their own geographic tools, dashboards, and location-based services.

Ultimately, **MAPA-Hayag** aspires to become an open, extensible, and community-driven geographic platform that encourages innovation, transparency, and greater accessibility to Philippine geographic information.

## Technology Stack

**Current:** HTML5, CSS3, Vanilla JavaScript, D3.js, GeoJSON/TopoJSON, JSON

**Planned:** React.js, TypeScript, Tailwind CSS, Vite, D3.js, GeoJSON/TopoJSON

An isolated React migration preview is available in [`react-app/`](react-app/README.md), including national → regional → provincial → city/municipality drilldown, validated configuration, cached geographic services, NIR/legacy alignment and browser navigation. The root HTML applications remain the production entry points, with runnable comparison copies in [`legacy/`](legacy/README.md). See the [baseline contract](docs/migration/BASELINE.md) and [verification results](docs/migration/RESULTS.md) for current validation and remaining acceptance gates.

## Current Features

- Interactive Philippine map with administrative drilldown
- Clickable geographic boundaries and information panels
- Dynamic choropleth coloring and configurable datasets
- PSGC-based geographic identification
- Negros Island Region (NIR) and legacy 17-region support
- Dynamic geographic data loading

## Geographic Coverage

| Administrative Level | Status |
|---|---|
| Philippines | Supported |
| Regions | Supported |
| Provinces / Districts | Supported |
| Cities / Municipalities | Supported |
| Barangays | Not yet supported |

Certain geographic areas, including highly urbanized cities and NCR districts, require special handling.

## Contributing

**Contributions are welcome!** 🇵🇭

MAPA-Hayag is an open-source project, and everyone interested in Philippine geography, mapping, and web development is encouraged to contribute.

Whether you're a developer, designer, GIS enthusiast, researcher, or student, you can help improve the project by:

- Reporting bugs and suggesting new features through GitHub Issues.
- Submitting pull requests for improvements and bug fixes.
- Improving the user interface, accessibility, and performance.
- Validating geographic boundaries and updating geographic datasets.
- Enhancing documentation and sharing ideas for future applications.

Every contribution, big or small, helps make Philippine geographic information more accessible.

**Let's build a more accessible, accurate, and interactive geographic platform for the Philippines, together!**

## Credits & Acknowledgments

This project is based on the original **[ph-drilldown-map by tordecilla](https://github.com/tordecilla/ph-drilldown-map)**.

Full credit goes to the original developer and contributors for the foundational map implementation, geographic data integration, and interactive drilldown functionality.

For detailed explanations of how the map works, its geographic data sources, configuration, and original implementation, please refer to the **[original repository's README](https://github.com/tordecilla/ph-drilldown-map#readme)**.

This project aims to build upon that foundation through React modernization, improved user experience, and future geographic features.
