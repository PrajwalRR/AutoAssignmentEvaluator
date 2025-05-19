import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

# 📊 Sample Dataset (Glucose, Blood Pressure, Diabetes)
data = {
    'glucose': [85, 90, 78, 120, 130, 100, 105, 88, 115, 98],
    'bloodpressure': [70, 80, 60, 90, 85, 75, 88, 68, 92, 74],
    'diabetes': [0, 0, 0, 1, 1, 1, 1, 0, 1, 0]
}

df = pd.DataFrame(data)

# 🏗️ Features and target
X = df[['glucose', 'bloodpressure']]
y = df['diabetes']

# ✂️ Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 📈 Train Logistic Regression Model
model = LogisticRegression()
model.fit(X_train, y_train)

# 🔍 Make predictions
y_pred = model.predict(X_test)

# 📊 Evaluate the model
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))
