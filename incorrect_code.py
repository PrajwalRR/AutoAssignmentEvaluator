# error_code_logistic_wrong_labels.py

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Sample dataset
X = [[85, 66], [89, 74], [95, 70], [110, 85], [130, 90], [150, 100]]
y = [1, 1, 1, 0, 0, 0]  # ❌ Incorrect labels — inverted

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Logistic Regression model
model = LogisticRegression()
model.fit(X_train, y_train)

# Prediction
y_pred = model.predict(X_test)

# Accuracy
print("WRONG Logistic Regression Accuracy:", accuracy_score(y_test, y_pred))
