{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
				"dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/${dynamodb_table}"
        }
    ]
}