using FWITD;
using QStorage;
using System;
using System.Collections.Generic;
using System.Data;
using System.Text;
using System.Text.Json.Nodes;

namespace FWITD.Controllers.AnaliziDiDati {
    internal class DataAnalizis1Controller {
        private const string SQL_GET_VENDITE = @"SELECT Q1.DateTime,
   Q1.Title,
   Q1.IDProdotto,
   Q1.Amount,
   Q1.RemainingCredit,
   Q1.SessionID,
   CASE
      WHEN Q1.IsGrattaEVinci = 1 THEN 'GRATTA E VINCI'
      ELSE COALESCE(Q2.Categoria, 'NON CATEGORIZZATO')
   END AS Categoria
FROM (
      Select iwmiMovDate + iwmiMovTime as DateTime,
         CASE
            WHEN IW_Items.iwieDescription1 = IW_Items.iwieDescription2 THEN IW_Items.iwieDescription1
            ELSE IW_Items.iwieDescription1 + ' ' + IW_Items.iwieDescription2
         END AS Title,
         CASE
            WHEN IW_MovItems.iwmiItemType = 5002 THEN 1
            ELSE 0
         END AS IsGrattaEVinci,
         IW_MovItems.iwmiItem as IDProdotto,
         IW_MovItems.iwmiAmount as Amount,
         IW_MovItems.iwmiTempAmount2 as RemainingCredit,
         IW_MovItems.SessionID
      from IW_MovItems
         left join IW_Items on IW_Items.iwieItem = IW_MovItems.iwmiItem
      where iwmiMovStatus = 2 
            -- and iwmiMovDate+iwmiMovTime >= @0
            -- and iwmiMovDate+iwmiMovTime <= @1
   ) AS Q1
   LEFT JOIN (
      SELECT dbo.IW_Items.iwieItem AS IDProdotto,
         dbo.IW_Kinds1.iwk1Description AS Categoria
      FROM dbo.IW_Items
         INNER JOIN dbo.IW_Items_Kinds1 ON dbo.IW_Items.iwieItem = dbo.IW_Items_Kinds1.iwi1Item
         INNER JOIN dbo.IW_Kinds1 ON dbo.IW_Items_Kinds1.iwi1Kind1 = dbo.IW_Kinds1.iwk1Kind1
   ) AS Q2 ON Q1.IDProdotto = Q2.IDProdotto
order by DateTime desc;";
        public object GetVendite(JsonNode req) {
            DateTime start_date = DateTime.Parse(req["start_date"].GetValue<string>(), null, System.Globalization.DateTimeStyles.RoundtripKind);
            DateTime end_date = DateTime.Parse(req["end_date"].GetValue<string>(), null, System.Globalization.DateTimeStyles.RoundtripKind);
            DataTable dt = SQL.ExecuteQuery(SQL_GET_VENDITE, [start_date.ToString("yyyy-MM-dd HH:mm:ss"), end_date.ToString("yyyy-MM-dd HH:mm:ss")]);
            return Utils.DataTransfer.ToSimpleTable(dt);
        }
        public object GetChange() {
            DataTable dt = SQL.ExecuteQuery(@"SELECT  
                                                iwmiMovDate + iwmiMovTime AS TheTime,
                                                iwmiMovCause AS Category,
                                                iwmiAmount AS Change,
                                                SUM(iwmiAmount) OVER (
                                                    ORDER BY iwmiMovDate + iwmiMovTime
                                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                                ) AS CumulativeChange
                                            FROM IW_MovItems
                                            order by TheTime DESC;");
            return Utils.DataTransfer.ToSimpleTable(dt);
        }
    }
}
