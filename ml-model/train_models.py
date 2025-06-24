import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

# === Load datasets ===
attendance_df = pd.read_csv("rfidCampus.attendances.csv")
transactions_df = pd.read_csv("rfidCampus.transactions.csv")

# === Step 1: Attendance Models ===
attendance_df["isAttended"] = attendance_df["status"].apply(lambda x: 1 if x == "Attended" else 0)

attendance_summary = attendance_df.groupby("studentId").agg(
    attendanceRate=("isAttended", "mean"),
    totalLectures=("status", "count")
).reset_index()

late_df = attendance_df[attendance_df["status"] == "Late"].groupby("studentId").size()
absent_df = attendance_df[attendance_df["status"] == "Absent"].groupby("studentId").size()

attendance_summary["lateRate"] = attendance_summary["studentId"].map(late_df).fillna(0) / attendance_summary["totalLectures"]
attendance_summary["absenceRate"] = attendance_summary["studentId"].map(absent_df).fillna(0) / attendance_summary["totalLectures"]

X_att = attendance_summary[["attendanceRate", "lateRate", "absenceRate"]]
y_att = (attendance_summary["attendanceRate"] >= 0.75).astype(int)

X_att_train, X_att_test, y_att_train, y_att_test = train_test_split(X_att, y_att, test_size=0.2, random_state=42)

attendance_model = RandomForestClassifier()
attendance_model.fit(X_att_train, y_att_train)

advanced_attendance_model = LogisticRegression()
advanced_attendance_model.fit(X_att_train, y_att_train)

# === Step 2: Spending Models ===
transactions_df["timestamp"] = pd.to_datetime(transactions_df["timestamp"], errors='coerce')
transactions_df["date"] = transactions_df["timestamp"].dt.date

spend_summary = transactions_df.groupby("userId").agg(
    totalSpend=("amount", "sum"),
    numTransactions=("amount", "count"),
    uniqueDays=("date", lambda x: len(set(x)))
).reset_index()

spend_summary["avgSpend"] = spend_summary["totalSpend"] / spend_summary["numTransactions"]
spend_summary["transactionsPerDay"] = spend_summary["numTransactions"] / spend_summary["uniqueDays"].replace(0, 1)

# ✅ Avoid unrealistic monthly values
spend_summary["monthlyTotalSpend"] = (
    spend_summary["totalSpend"] / (spend_summary["uniqueDays"] + 1e-5) * 5
).clip(upper=1000)

# 🏷 Labeling functions
def label_category(x):
    if x < 300:
        return "Low"
    elif x <= 1000:
        return "Medium"
    else:
        return "High"


def label_type(x):
    if x < 20:
        return "Essential"
    elif x < 50:
        return "Mixed"
    return "Luxury"

spend_summary["label"] = spend_summary["monthlyTotalSpend"].apply(label_category)
spend_summary["type"] = spend_summary["avgSpend"].apply(label_type)

label_enc = LabelEncoder()
type_enc = LabelEncoder()

spend_summary["label_encoded"] = label_enc.fit_transform(spend_summary["label"])
spend_summary["type_encoded"] = type_enc.fit_transform(spend_summary["type"])

X_spend = spend_summary[["avgSpend", "transactionsPerDay", "monthlyTotalSpend"]]
y_spend_label = spend_summary["label_encoded"]
y_spend_type = spend_summary["type_encoded"]
y_spend_reg = spend_summary["monthlyTotalSpend"]

spending_model = RandomForestClassifier()
spending_model.fit(X_spend, y_spend_label)

spending_type_model = RandomForestClassifier()
spending_type_model.fit(X_spend, y_spend_type)

spending_regressor = RandomForestRegressor()
spending_regressor.fit(X_spend, y_spend_reg)

# === Save Models ===
joblib.dump(attendance_model, "attendance_model.pkl")
joblib.dump(advanced_attendance_model, "advanced_attendance_model.pkl")
joblib.dump(spending_model, "spending_model.pkl")
joblib.dump(spending_type_model, "spending_type_model.pkl")
joblib.dump(spending_regressor, "spending_regression.pkl")

print("✅ All models trained and saved.")
