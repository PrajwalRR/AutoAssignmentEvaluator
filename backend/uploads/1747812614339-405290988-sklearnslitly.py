# Linear Regression with visualization
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

# Load the data
df = pd.read_csv('data.csv')
features = df[['feature1', 'feature2']]
labels = df['target']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2)

# Model training
lr_model = LinearRegression()
lr_model.fit(X_train, y_train)

# Prediction
predictions = lr_model.predict(X_test)

# Evaluation
error = mean_squared_error(y_test, predictions)
print("MSE:", error)

# Optional visualization
plt.scatter(y_test, predictions)
plt.title("Actual vs Predicted")
plt.xlabel("Actual")
plt.ylabel("Predicted")
plt.show()
