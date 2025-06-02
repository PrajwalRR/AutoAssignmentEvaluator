# Incorrect ML implementation
import pandas as pd
from sklearn.linear_model import LinearRegression

data = pd.read_csv('data.csv')
X = data['feature1']  # Only one feature used incorrectly
y = data['target']

# Forgot train_test_split
model = LinearRegression()
model.fit(X, y)  # Will raise error: X must be 2D

# Prediction with no test data
preds = model.predict(X)  # Misuse
print("Predictions", preds
