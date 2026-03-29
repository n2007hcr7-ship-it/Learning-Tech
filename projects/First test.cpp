#include <iostream>
using namespace std;

int main() {
    char op;
    double x, y;

    cout << "أدخل العملية (+ - * /): ";
    cin >> op;
    cout << "أدخل رقمين: ";
    cin >> x >> y;

    switch(op) {
        case '+': 
            cout << "النتيجة = " << x + y; 
            break;
        case '-': 
            cout << "النتيجة = " << x - y; 
            break;
        case '*': 
            cout << "النتيجة = " << x * y; 
            break;
        case '/': 
            if(y != 0) cout << "النتيجة = " << x / y;
            else cout << "خطأ: قسمة على صفر!";
            break;
        default:
            cout << "عملية غير صالحة!";
    }

    return 0;
}
