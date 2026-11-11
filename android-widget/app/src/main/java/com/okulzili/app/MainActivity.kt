package com.okulzili.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView

    inner class WidgetBridge {
        @JavascriptInterface
        fun updateNotes(json: String) {
            getSharedPreferences(SchoolBellWidgetProvider.PREFS, Context.MODE_PRIVATE)
                .edit().putString(SchoolBellWidgetProvider.KEY_NOTES, json).apply()
            sendBroadcast(Intent(SchoolBellWidgetProvider.ACTION_REFRESH).setPackage(packageName))
        }

        @JavascriptInterface
        fun updateSchedule(json: String) {
            getSharedPreferences(SchoolBellWidgetProvider.PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(SchoolBellWidgetProvider.KEY_SCHEDULE, json)
                .apply()
            sendBroadcast(Intent(SchoolBellWidgetProvider.ACTION_REFRESH).setPackage(packageName))
        }
    }

    @Suppress("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        // Vite builds ES modules; permit local module files to load from the bundled file:// origin.
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(WidgetBridge(), "SchoolBellWidget")
        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
