NER-SAFE

AI-Based Early Warning and Landslide Risk Monitoring System for the North Eastern Region of India

NER-SAFE is an integrated disaster-management and early-warning platform designed for the North Eastern Region (NER) of India. It combines live weather intelligence, terrain and soil information, historical landslide records, GIS visualization, field incident reporting, multi-factor risk assessment, AI-assisted interpretation, and emergency alert workflows in one platform.

The system is designed to help authorities and field personnel monitor changing environmental conditions, identify vulnerable locations, assess landslide risk, receive field reports, and respond faster.

Key Features
Live Monitor
Location-based live weather monitoring
Current temperature, humidity, rainfall, wind and pressure
Hourly and daily forecasts
Weather alert indicators
State and district selection across NER and India
8-State NER Hub

Provides regional environmental and terrain monitoring for:

Arunachal Pradesh
Assam
Manipur
Meghalaya
Mizoram
Nagaland
Sikkim
Tripura

Includes:

Soil moisture information
Elevation and terrain analysis
Calculated slope information
Satellite/environmental observations
Historical landslide records
Regional data-source/status information
Risk Monitor

NER-SAFE uses a transparent multi-factor landslide risk engine based on:

Terrain slope
Soil moisture/saturation
Current and antecedent rainfall
Forecast precipitation
Historical landslide proximity
Ground incident reports

The resulting 0–100 prototype risk score is interpreted with Google Gemini to provide:

Main driving factors
Causal explanation
Uncertainty notes
Monitoring recommendations

The risk score is a prototype multi-factor assessment and is not presented as a scientifically calibrated probability.

Authority Incident Monitor
Real incident reports from MongoDB Atlas
Incident filtering and search
Workflow statuses: SUBMITTED, UNDER REVIEW, VERIFIED, RESOLVED
GPS/location information
Photo and video evidence
GIS visualization
Authority-side incident review and status updates
Report Incident

Citizens and field personnel can submit:

Landslides
Ground cracks
Rockfall
Slope movement
Road subsidence/blockage
Flash-flood related hazards
Other field observations

Supports GPS location, manual map pin selection, image/video evidence, descriptions, and persistent incident IDs.

Send Alert
Emergency alert composition
Severity and risk selection
Verified recipient selection from MongoDB
Email warnings through Brevo
Native phone SMS workflow for prototype alert broadcasting
Real delivery/preparation status without fake success reporting
Multilingual Interface

The frontend supports a centralized internationalization system for multiple languages, including English and regional languages configured for the NER deployment.

Cross-Border Weather Intelligence

Future expansion of NER-SAFE includes monitoring weather conditions and alerts from the neighboring countries connected to the NER:

Bangladesh
Bhutan
China
Myanmar
Nepal

This is intended to provide broader situational awareness for weather systems that may influence NER.

Data & Technology
Weather
Open-Meteo weather services
WMO weather-code interpretation
ECMWF-backed meteorological/model data where applicable
Terrain & Soil
Copernicus DEM elevation/terrain information
Calculated slope and aspect
ECMWF ERA5-Land soil moisture information
Historical Hazard Data
Geological Survey of India historical landslide information
Other verified historical datasets incorporated by the application
GIS
Interactive map visualization
OpenStreetMap/Carto-based mapping layers
Incident and hazard markers
AI
Google Gemini for intelligent interpretation of the deterministic risk-engine output
Database & Storage
MongoDB Atlas for persistent users and incident records
Cloudinary for incident image/video storage
Communication
Brevo for email OTP and disaster-warning email delivery
2Factor for mobile OTP verification
Native phone SMS workflow for prototype warning delivery
