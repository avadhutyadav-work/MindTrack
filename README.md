# MindTrack: Tracking Student Mental Well-being

MindTrack estimates a student's **mental health score** from personal details, social media habits and lifestyle. A scikit-learn model is served through a FastAPI backend, and a plain HTML, CSS and JavaScript frontend sends the inputs and shows the result.

> **Disclaimer:** the score is a statistical estimate produced by a machine learning model. It is **not** a clinical diagnosis and must not be used to make decisions about anyone's health.


## Features

- Three form sections: personal information, social media usage and lifestyle
- Client-side validation that matches the backend rules (ranges, whole numbers, required fields)
- Inline error messages, plus handling of FastAPI `422` validation errors and server errors
- Loading state while the prediction runs
- Animated score gauge with the result shown to two decimal places
- "Predict another student" button that resets the form
- Responsive layout for desktop, tablet and mobile
- No frontend framework or build step

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Fetch API) |
| Backend | Python, FastAPI, Pydantic |
| ML | scikit-learn, pandas, joblib |

## Project structure

```text
Project/
├── main.py
├── Mental_Health_Model.pkl
├── requirements.txt
├── README.md
├── docs/
│   ├── preview-form.png
│   └── preview-result.png
└── static/
    ├── index.html
    ├── style.css
    └── script.js
```

## Getting started

1. **Clone the repository** and open a terminal in the project folder.

2. **Install dependencies.** Use the same scikit-learn version the model was trained with, or the `.pkl` file may not load.
   ```bash
   pip install -r requirements.txt
   ```

3. **Serve the frontend from FastAPI.** Add these lines to `main.py` if they are not there yet:
   ```python
   from fastapi.staticfiles import StaticFiles
   from fastapi.responses import FileResponse

   app.mount("/static", StaticFiles(directory="static"), name="static")

   @app.get("/", include_in_schema=False)
   def home():
       return FileResponse("static/index.html")
   ```
   Run the app from the project folder so the `static` path resolves. The model path in `main.py` should also point to `Mental_Health_Model.pkl`.

4. **Start the server.**
   ```bash
   uvicorn main:app --reload
   ```

5. **Open the app** at <https://mindtrack-2.onrender.com/>. The interactive API docs are at <https://mindtrack-2.onrender.com/docs>.

The frontend reads the backend address from `BASE_URL` at the top of `static/script.js`. Change it, and the two asset URLs in `static/index.html`, if you deploy to another host.

## API

### `POST /predict`

Request body (field names must match exactly):

| Field | Type | Allowed values |
|---|---|---|
| `Age` | integer | 10 to 100 |
| `Gender` | string | `Male`, `Female` |
| `Country` | string | any country name (`USA` and `UK` for those countries) |
| `Academic_Level` | string | `Undergraduate`, `Graduate`, `High School` |
| `Most_Used_Platform` | string | `Facebook`, `LinkedIn`, `Instagram`, `Snapchat`, `Twitter`, `YouTube`, `TikTok`, `LINE`, `KakaoTalk`, `VKontakte`, `WhatsApp`, `WeChat` |
| `Purpose_Of_Use` | string | `Networking`, `Education`, `Entertainment`, `News` |
| `Avg_Daily_Usage_Hours` | float | 0 to 24 |
| `Daily_Unlocks` | integer | 0 or more |
| `Study_Hours` | float | 0 to 24 |
| `Physical_Activity_Hours` | float | 0 to 24 |
| `Sleep_Hours_Per_Night` | float | 0 to 24 |
| `Stress_Level` | string | `Low`, `Medium`, `High`, `Very High` |

`Grouped_country` is calculated in the backend from `Country`, so the client does not send it.

Example:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 20,
    "Gender": "Female",
    "Country": "India",
    "Academic_Level": "Undergraduate",
    "Most_Used_Platform": "Instagram",
    "Purpose_Of_Use": "Entertainment",
    "Avg_Daily_Usage_Hours": 4.5,
    "Daily_Unlocks": 60,
    "Study_Hours": 3,
    "Physical_Activity_Hours": 1,
    "Sleep_Hours_Per_Night": 7,
    "Stress_Level": "Medium"
  }'
```

Response (the value depends on the model):

```json
{ "predicted_mental_health_score": 6.42 }
```

## Notes

- The gauge assumes a 0 to 10 scale. Change `SCORE_MAX` in `static/script.js` if your model's scores use a different range.
- CORS is open (`allow_origins=["*"]`) for local development. Restrict it before deploying publicly.

## License

Add a license of your choice (for example MIT) before publishing.
