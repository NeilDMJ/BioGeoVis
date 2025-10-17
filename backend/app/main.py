from fastapi import FastAPI
from pymongo import MongoClient
import os

app = FastAPI()

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client[os.getenv("MONGO_DB", "biogeovis")]

@app.get("/")
def root():
    return {"message": "Backend del proyecto funcionando"}

@app.get("/api/sightings")
def get_sightings():
    return list(db.sightings.find({}, {"_id": 0}))
