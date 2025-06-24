import pandas as pd
import numpy as np
from pymongo import MongoClient
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
import joblib

# 1. Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["rfidCampus"]
transactions_col = db["transactions"]
attendances_col = db["attendances"]

# 2. Load data
transactions = pd.DataFrame(list(transactions_col.find()))
attendances = pd.DataFrame(list(attendances_col.find()))

# 3. Summarize data
tx_summary = transactions.groupby("userId").agg(
    total_amount=("amount", "sum"),
    transaction_count=("amount", "count"),
    avg_amount=("amount", "mean")
).reset_index()

att_summary = attendances.groupby("studentId").agg(
    total=("status", "count"),
    attended=("status", lambda x: (x == "Attended").sum()),
    late=("status", lambda x: (x == "Late").sum()),
    absent=("status", lambda x: (x == "Absent").sum())
).reset_index()

# 4. Attendance metrics
att_summary["attendance_rate"] = att_summary["attended"] / att_summary["total"]
att_summary["late_rate"] = att_summary["late"] / att_summary["total"]
att_summary["absent_rate"] = att_summary["absent"] / att_summary["total"]

# 5. Labeling functions
def attendance_label(rate):
    if rate > 0.85: return "Excellent"
    elif rate > 0.65: return "Moderate"
    else: return "Poor"

def advanced_attendance_label(row):
    if row["attendance_rate"] > 0.9 and row["late_rate"] < 0.05: return "Highly Committed"
    elif row["attendance_rate"] > 0.75: return "Generally Reliable"
    elif row["attendance_rate"] > 0.5: return "Unstable Attendance"
    else: return "High Risk of Absence"

def spending_label(avg):
    if avg > 100: return "High"
    elif avg > 50: return "Moderate"
    else: return "Low"

def spending_type_label(row):
    if row["transaction_count"] > 15: return "Frequent Buyer"
    elif row["avg_amount"] > 100: return "Occasional High Spender"
    elif row["total_amount"] < 200: return "Low Spender"
    else: return "Moderate Purchaser"

# 6. Apply labels
att_summary["attendance_label"] = att_summary["attendance_rate"].apply(attendance_label)
att_summary["advanced_attendance"] = att_summary.apply(advanced_attendance_label, axis=1)

tx_summary["spending_label"] = tx_summary["avg_amount"].apply(spending_label)
tx_summary["spending_type"] = tx_summary.apply(spending_type_label, axis=1)

# 7. Merge
data = pd.merge(att_summary, tx_summary, left_on="studentId", right_on="userId", how="inner")

# 8. Features and Labels
attendance_features = data[["attendance_rate", "late_rate", "absent_rate"]]
attendance_labels = data["attendance_label"]
advanced_attendance_labels = data["advanced_attendance"]

spending_features = data[["total_amount", "transaction_count", "avg_amount"]]
spending_labels = data["spending_label"]
spending_type_labels = data["spending_type"]

# 9. Encode
att_le = LabelEncoder()
adv_att_le = LabelEncoder()
spend_le = LabelEncoder()
spend_type_le = LabelEncoder()

attendance_labels_enc = att_le.fit_transform(attendance_labels)
advanced_attendance_labels_enc = adv_att_le.fit_transform(advanced_attendance_labels)

spending_labels_enc = spend_le.fit_transform(spending_labels)
spending_type_labels_enc = spend_type_le.fit_transform(spending_type_labels)

# 10. Train Models
att_model = DecisionTreeClassifier()
att_model.fit(attendance_features, attendance_labels_enc)

adv_att_model = DecisionTreeClassifier()
adv_att_model.fit(attendance_features, advanced_attendance_labels_enc)

spend_model = DecisionTreeClassifier()
spend_model.fit(spending_features, spending_labels_enc)

spend_type_model = DecisionTreeClassifier()
spend_type_model.fit(spending_features, spending_type_labels_enc)

spend_predictor = LinearRegression()
spend_predictor.fit(spending_features, data["avg_amount"])

# 11. Save All
joblib.dump(att_model, "attendance_model.pkl")
joblib.dump(adv_att_model, "advanced_attendance_model.pkl")
joblib.dump(att_le, "attendance_encoder.pkl")
joblib.dump(adv_att_le, "advanced_attendance_encoder.pkl")

joblib.dump(spend_model, "spending_model.pkl")
joblib.dump(spend_type_model, "spending_type_model.pkl")
joblib.dump(spend_le, "spending_encoder.pkl")
joblib.dump(spend_type_le, "spending_type_encoder.pkl")

joblib.dump(spend_predictor, "spending_regression.pkl")

print("✅ All models trained and saved.")
