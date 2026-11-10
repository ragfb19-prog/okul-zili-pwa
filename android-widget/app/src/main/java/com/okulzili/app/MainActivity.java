package com.okulzili.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;

public class MainActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("(function(){var s=localStorage.getItem('danisment_schedule_data');if(s&&window.SchoolBellWidget)window.SchoolBellWidget.updateSchedule(s);})();", null);
            }
        });
        web.addJavascriptInterface(new WidgetBridge(), "SchoolBellWidget");
        web.loadUrl("https://okul-zili-pwa.onrender.com/");
    }
    private class WidgetBridge {
        @JavascriptInterface public void updateSchedule(String json) {
            getSharedPreferences("school_widget", MODE_PRIVATE).edit().putString("schedule", json).apply();
            runOnUiThread(() -> SchoolBellWidgetProvider.updateAll(MainActivity.this));
        }
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
